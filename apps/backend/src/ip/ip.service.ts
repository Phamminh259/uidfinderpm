import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { isIP } from 'net';
import { hashWithSalt, normalizeIp } from '../common/hash.util';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

export const BLOCKED_SET = 'ipblock:set';
export const LIMIT_HASH = 'iplimit:hash';
const TOUCH_EVERY_MS = 60_000;
const RETENTION_DAYS = 90;

export function ipHashOf(ip: string): string {
  return hashWithSalt(normalizeIp(ip), process.env.ANALYTICS_IP_SALT ?? '');
}

/**
 * Quản lý địa chỉ IP truy cập: ghi nhận, chặn/bỏ chặn, giới hạn riêng.
 * Nguồn dữ liệu chuẩn là PostgreSQL; Redis giữ bản sao để kiểm tra nhanh ở mỗi request.
 */
@Injectable()
export class IpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IpService.name);
  private readonly lastTouch = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.resync().catch((e: Error) => this.logger.warn(`Chưa đồng bộ được danh sách IP bị chặn: ${e.message}`));
    this.timer = setInterval(() => void this.cleanup(), 24 * 3600_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Ghi nhận IP vừa truy cập (tối đa một lần ghi mỗi phút cho mỗi IP). Không bao giờ ném lỗi. */
  async touch(ip: string): Promise<void> {
    const normalized = normalizeIp(ip);
    if (isIP(normalized) === 0) return;
    const ipHash = ipHashOf(normalized);
    const now = Date.now();
    const last = this.lastTouch.get(ipHash);
    if (last !== undefined && now - last < TOUCH_EVERY_MS) return;
    if (this.lastTouch.size > 20_000) this.lastTouch.clear();
    this.lastTouch.set(ipHash, now);
    try {
      await this.prisma.ipRecord.upsert({
        where: { ipHash },
        create: { ipHash, ip: normalized },
        update: { lastSeenAt: new Date() },
      });
    } catch (e) {
      this.logger.warn(`Không ghi được IpRecord: ${(e as Error).message}`);
    }
  }

  async isBlocked(ip: string): Promise<boolean> {
    try {
      return (await this.redis.client.sismember(BLOCKED_SET, normalizeIp(ip))) === 1;
    } catch {
      return false; // Redis lỗi: không chặn nhầm người dùng.
    }
  }

  /** Giới hạn riêng của IP (lượt/phút), hoặc null nếu dùng giới hạn chung. */
  async customLimit(ip: string): Promise<number | null> {
    try {
      const v = await this.redis.client.hget(LIMIT_HASH, normalizeIp(ip));
      const n = v === null ? NaN : Number(v);
      return Number.isInteger(n) && n >= 0 ? n : null;
    } catch {
      return null;
    }
  }

  parseIp(input: unknown): string {
    if (typeof input !== 'string') throw new BadRequestException('Địa chỉ IP không hợp lệ');
    const ip = normalizeIp(input);
    if (isIP(ip) === 0) throw new BadRequestException('Địa chỉ IP không hợp lệ');
    return ip;
  }

  async block(ip: string, reason?: string): Promise<void> {
    const ipHash = ipHashOf(ip);
    const now = new Date();
    await this.prisma.ipRecord.upsert({
      where: { ipHash },
      create: { ipHash, ip, blocked: true, blockedAt: now, blockedReason: reason?.slice(0, 200) ?? null },
      update: { blocked: true, blockedAt: now, blockedReason: reason?.slice(0, 200) ?? null },
    });
    await this.redis.client.sadd(BLOCKED_SET, ip);
  }

  async unblock(ip: string): Promise<boolean> {
    const ipHash = ipHashOf(ip);
    const existing = await this.prisma.ipRecord.findUnique({ where: { ipHash } });
    if (existing) {
      await this.prisma.ipRecord.update({
        where: { ipHash },
        data: { blocked: false, blockedAt: null, blockedReason: null },
      });
    }
    await this.redis.client.srem(BLOCKED_SET, ip);
    return Boolean(existing?.blocked);
  }

  /** Đặt giới hạn riêng cho IP; `limit = null` để quay về giới hạn chung. */
  async setLimit(ip: string, limit: number | null): Promise<void> {
    const ipHash = ipHashOf(ip);
    await this.prisma.ipRecord.upsert({
      where: { ipHash },
      create: { ipHash, ip, limitPerMinute: limit },
      update: { limitPerMinute: limit },
    });
    if (limit === null) await this.redis.client.hdel(LIMIT_HASH, ip);
    else await this.redis.client.hset(LIMIT_HASH, ip, String(limit));
  }

  /** Dựng lại bản sao Redis từ PostgreSQL (khi khởi động). */
  async resync(): Promise<void> {
    const rows = await this.prisma.ipRecord.findMany({
      where: { OR: [{ blocked: true }, { limitPerMinute: { not: null } }] },
      select: { ip: true, blocked: true, limitPerMinute: true },
    });
    const pipe = this.redis.client.multi().del(BLOCKED_SET).del(LIMIT_HASH);
    for (const r of rows) {
      if (r.blocked) pipe.sadd(BLOCKED_SET, r.ip);
      if (r.limitPerMinute !== null) pipe.hset(LIMIT_HASH, r.ip, String(r.limitPerMinute));
    }
    await pipe.exec();
  }

  /** Xóa IP không bị chặn, không có giới hạn riêng và đã lâu không truy cập. */
  async cleanup(): Promise<void> {
    try {
      const before = new Date(Date.now() - RETENTION_DAYS * 86400_000);
      const r = await this.prisma.ipRecord.deleteMany({
        where: { blocked: false, limitPerMinute: null, lastSeenAt: { lt: before } },
      });
      if (r.count > 0) this.logger.log(`Đã xóa ${r.count} IP không còn hoạt động quá ${RETENTION_DAYS} ngày`);
    } catch (e) {
      this.logger.warn(`Dọn IpRecord thất bại: ${(e as Error).message}`);
    }
  }
}
