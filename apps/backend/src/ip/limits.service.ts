import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DEFAULT_THRESHOLDS, SuspicionThresholds } from './ip-classify';

export interface Limits extends SuspicionThresholds {
  /** Số lượt tra cứu UID tối đa mỗi phút trên mỗi IP. */
  uidPerMinute: number;
  /** Số lượt tra cứu UID tối đa mỗi giờ trên mỗi IP (0 = không giới hạn theo giờ). */
  uidPerHour: number;
}

const KEY = 'limits';
const CACHE_MS = 15_000;

/** [tối thiểu, tối đa] cho từng trường, dùng để kiểm tra dữ liệu quản trị viên nhập. */
export const LIMIT_RANGES: Record<keyof Limits, [number, number]> = {
  uidPerMinute: [1, 600],
  uidPerHour: [0, 100_000],
  requestsPerDay: [0, 1_000_000],
  rateLimitedHits: [0, 100_000],
  invalidHits: [0, 100_000],
  failPercent: [0, 100],
  failMinAttempts: [1, 100_000],
};

export function defaultLimits(): Limits {
  const perMinute = Number(process.env.UID_RATE_LIMIT_PER_MINUTE ?? 10);
  return {
    uidPerMinute: Number.isFinite(perMinute) && perMinute >= 1 ? Math.floor(perMinute) : 10,
    uidPerHour: 120,
    ...DEFAULT_THRESHOLDS,
  };
}

/** Giới hạn request và ngưỡng nghi vấn, lưu trong bảng SiteSetting (khóa "limits"). */
@Injectable()
export class LimitsService {
  private cache: { value: Limits; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<Limits> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const base = defaultLimits();
    let stored: Partial<Limits> = {};
    try {
      const row = await this.prisma.siteSetting.findUnique({ where: { key: KEY } });
      if (row && typeof row.value === 'object' && row.value !== null && !Array.isArray(row.value)) {
        stored = row.value as unknown as Partial<Limits>;
      }
    } catch {
      // Không đọc được cấu hình: dùng mặc định thay vì làm hỏng tra cứu.
      return base;
    }
    const value = { ...base };
    for (const k of Object.keys(LIMIT_RANGES) as (keyof Limits)[]) {
      const v = stored[k];
      if (typeof v === 'number' && Number.isInteger(v) && v >= LIMIT_RANGES[k][0] && v <= LIMIT_RANGES[k][1]) {
        value[k] = v;
      }
    }
    this.cache = { value, at: Date.now() };
    return value;
  }

  async update(input: Partial<Record<keyof Limits, unknown>>): Promise<Limits> {
    const current = await this.get();
    const next: Limits = { ...current };
    for (const k of Object.keys(LIMIT_RANGES) as (keyof Limits)[]) {
      const v = input[k];
      if (v === undefined) continue;
      const [min, max] = LIMIT_RANGES[k];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
        throw new BadRequestException(`Giá trị "${k}" phải là số nguyên từ ${min} đến ${max}`);
      }
      next[k] = v;
    }
    await this.prisma.siteSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: next as unknown as Prisma.InputJsonObject },
      update: { value: next as unknown as Prisma.InputJsonObject },
    });
    this.cache = { value: next, at: Date.now() };
    return next;
  }
}
