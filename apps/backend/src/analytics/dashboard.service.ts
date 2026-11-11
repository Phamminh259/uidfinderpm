import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { classifyIp, IpStatus } from '../ip/ip-classify';
import { LimitsService } from '../ip/limits.service';
import { lastDays, RangeKey, TimeWindow, windowFor } from './ranges';
import { startOfDayVN } from './analytics.service';

export interface UidCounts {
  total: number;
  success: number;
  failed: number;
  invalid: number;
  rateLimited: number;
  /** Thành công / (thành công + thất bại), %, làm tròn 1 chữ số. null nếu chưa có lượt nào. */
  successRate: number | null;
}

export interface WindowStats {
  from: string;
  to: string;
  visits: { views: number; unique: number; sessions: number };
  uid: UidCounts;
  /** Số IP duy nhất theo từng trạng thái (một IP có thể xuất hiện ở nhiều trạng thái). */
  uidIps: UidCounts;
  sources: { source: string; views: number; unique: number }[];
  devices: { device: string; views: number; unique: number }[];
  pages: { path: string; views: number }[];
}

export interface IpRow {
  ip: string;
  views: number;
  lookups: number;
  requests: number;
  success: number;
  failed: number;
  invalid: number;
  rateLimited: number;
  firstSeenAt: string;
  lastSeenAt: string;
  blocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  limitPerMinute: number | null;
  status: IpStatus;
  reasons: string[];
}

type CountRow = { status: string | null; n: number; ips: number };

function toUidCounts(rows: CountRow[], pick: 'n' | 'ips'): UidCounts {
  const get = (s: string | null) => rows.find((r) => r.status === s)?.[pick] ?? 0;
  const success = get('SUCCESS');
  const failed = get('FAILED');
  const attempts = success + failed;
  return {
    total: get(null),
    success,
    failed,
    invalid: get('INVALID'),
    rateLimited: get('RATE_LIMITED'),
    successRate: attempts > 0 ? Math.round((success / attempts) * 1000) / 10 : null,
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limits: LimitsService,
  ) {}

  async windowStats(w: TimeWindow): Promise<WindowStats> {
    const { from, to } = w;
    const [pv, sources, devices, pages, uid] = await Promise.all([
      this.prisma.$queryRaw<{ views: number; visitors: number; sessions: number }[]>`
        SELECT COUNT(*)::int AS views,
               COUNT(DISTINCT "visitorHash")::int AS visitors,
               COUNT(DISTINCT "sessionId")::int AS sessions
        FROM "PageView"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}`,
      this.prisma.$queryRaw<{ source: string; views: number; visitors: number }[]>`
        SELECT "source", COUNT(*)::int AS views, COUNT(DISTINCT "visitorHash")::int AS visitors
        FROM "PageView"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY "source" ORDER BY views DESC`,
      this.prisma.$queryRaw<{ device: string; views: number; visitors: number }[]>`
        SELECT "device", COUNT(*)::int AS views, COUNT(DISTINCT "visitorHash")::int AS visitors
        FROM "PageView"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY "device" ORDER BY views DESC`,
      this.prisma.$queryRaw<{ path: string; views: number }[]>`
        SELECT "path", COUNT(*)::int AS views
        FROM "PageView"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY "path" ORDER BY views DESC, "path" ASC LIMIT 10`,
      // Dòng có status NULL là tổng của mọi trạng thái (GROUPING SETS).
      this.prisma.$queryRaw<CountRow[]>`
        SELECT "status"::text AS status, COUNT(*)::int AS n, COUNT(DISTINCT "ipHash")::int AS ips
        FROM "UidLookup"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY GROUPING SETS (("status"), ())`,
    ]);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      visits: { views: pv[0]?.views ?? 0, unique: pv[0]?.visitors ?? 0, sessions: pv[0]?.sessions ?? 0 },
      uid: toUidCounts(uid, 'n'),
      uidIps: toUidCounts(uid, 'ips'),
      sources: sources.map((s) => ({ source: s.source, views: s.views, unique: s.visitors })),
      devices: devices.map((d) => ({ device: d.device, views: d.views, unique: d.visitors })),
      pages,
    };
  }

  /** Số liệu cho các mốc cố định (hôm nay, 2 giờ, 7 ngày, 30 ngày) và tùy chọn một khoảng ngày. */
  async summary(custom?: { from: string; to: string }, now = new Date()) {
    const keys: Exclude<RangeKey, 'custom' | '24h'>[] = ['today', '2h', '7d', '30d'];
    const entries = await Promise.all(keys.map(async (k) => [k, await this.windowStats(windowFor(k, now))] as const));
    const windows: Record<string, WindowStats> = Object.fromEntries(entries);
    if (custom) windows.custom = await this.windowStats(windowFor('custom', now, custom.from, custom.to));
    return { generatedAt: now.toISOString(), windows };
  }

  /** Biểu đồ 30 ngày (giờ Việt Nam), đủ 30 điểm kể cả ngày không có dữ liệu. */
  async series30(now = new Date()) {
    const from = startOfDayVN(29, now);
    const [pv, uid] = await Promise.all([
      this.prisma.$queryRaw<{ day: string; views: number; visitors: number }[]>`
        SELECT to_char("createdAt" + interval '7 hours', 'YYYY-MM-DD') AS day,
               COUNT(*)::int AS views,
               COUNT(DISTINCT "visitorHash")::int AS visitors
        FROM "PageView"
        WHERE "createdAt" >= ${from}
        GROUP BY 1`,
      this.prisma.$queryRaw<{ day: string; lookups: number; ips: number }[]>`
        SELECT to_char("createdAt" + interval '7 hours', 'YYYY-MM-DD') AS day,
               COUNT(*)::int AS lookups,
               COUNT(DISTINCT "ipHash")::int AS ips
        FROM "UidLookup"
        WHERE "createdAt" >= ${from}
        GROUP BY 1`,
    ]);
    const pvMap = new Map(pv.map((r) => [r.day, r]));
    const uidMap = new Map(uid.map((r) => [r.day, r]));
    return lastDays(30, now).map((day) => ({
      day,
      views: pvMap.get(day)?.views ?? 0,
      visitors: pvMap.get(day)?.visitors ?? 0,
      uidLookups: uidMap.get(day)?.lookups ?? 0,
      uidIps: uidMap.get(day)?.ips ?? 0,
    }));
  }

  /**
   * Danh sách IP trong khoảng thời gian. Trạng thái bình thường/nghi vấn luôn tính theo 24 giờ gần nhất.
   * Lấy tối đa 500 IP hoạt động nhiều nhất (cộng mọi IP đang bị chặn).
   */
  async ipList(args: {
    range: RangeKey;
    from?: string;
    to?: string;
    q?: string;
    filter?: 'all' | 'suspicious' | 'blocked';
    page?: number;
    now?: Date;
  }) {
    const now = args.now ?? new Date();
    const w = windowFor(args.range, now, args.from, args.to);
    const since24 = new Date(now.getTime() - 24 * 3600_000);
    const q = (args.q ?? '').trim().slice(0, 64);
    if (/[^0-9a-fA-F:.%]/.test(q)) throw new BadRequestException('Từ khóa IP không hợp lệ');
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const thresholds = await this.limits.get();

    const rows = await this.prisma.$queryRaw<
      {
        ip: string;
        firstSeenAt: Date;
        lastSeenAt: Date;
        blocked: boolean;
        blockedAt: Date | null;
        blockedReason: string | null;
        limitPerMinute: number | null;
        views: number;
        lookups: number;
        success: number;
        failed: number;
        invalid: number;
        rateLimited: number;
        requests24: number;
        success24: number;
        failed24: number;
        invalid24: number;
        rateLimited24: number;
      }[]
    >`
      WITH pvw AS (
        SELECT "ipHash", COUNT(*)::int AS views FROM "PageView"
        WHERE "ipHash" IS NOT NULL AND "createdAt" >= ${w.from} AND "createdAt" < ${w.to}
        GROUP BY "ipHash"
      ), ulw AS (
        SELECT "ipHash",
               COUNT(*)::int AS lookups,
               (COUNT(*) FILTER (WHERE "status" = 'SUCCESS'))::int AS success,
               (COUNT(*) FILTER (WHERE "status" = 'FAILED'))::int AS failed,
               (COUNT(*) FILTER (WHERE "status" = 'INVALID'))::int AS invalid,
               (COUNT(*) FILTER (WHERE "status" = 'RATE_LIMITED'))::int AS rate_limited
        FROM "UidLookup"
        WHERE "ipHash" IS NOT NULL AND "createdAt" >= ${w.from} AND "createdAt" < ${w.to}
        GROUP BY "ipHash"
      ), pv24 AS (
        SELECT "ipHash", COUNT(*)::int AS views FROM "PageView"
        WHERE "ipHash" IS NOT NULL AND "createdAt" >= ${since24}
        GROUP BY "ipHash"
      ), ul24 AS (
        SELECT "ipHash",
               COUNT(*)::int AS lookups,
               (COUNT(*) FILTER (WHERE "status" = 'SUCCESS'))::int AS success,
               (COUNT(*) FILTER (WHERE "status" = 'FAILED'))::int AS failed,
               (COUNT(*) FILTER (WHERE "status" = 'INVALID'))::int AS invalid,
               (COUNT(*) FILTER (WHERE "status" = 'RATE_LIMITED'))::int AS rate_limited
        FROM "UidLookup"
        WHERE "ipHash" IS NOT NULL AND "createdAt" >= ${since24}
        GROUP BY "ipHash"
      )
      SELECT r."ip", r."firstSeenAt", r."lastSeenAt", r."blocked", r."blockedAt", r."blockedReason", r."limitPerMinute",
             COALESCE(pvw.views, 0)::int AS views,
             COALESCE(ulw.lookups, 0)::int AS lookups,
             COALESCE(ulw.success, 0)::int AS success,
             COALESCE(ulw.failed, 0)::int AS failed,
             COALESCE(ulw.invalid, 0)::int AS invalid,
             COALESCE(ulw.rate_limited, 0)::int AS "rateLimited",
             (COALESCE(pv24.views, 0) + COALESCE(ul24.lookups, 0))::int AS requests24,
             COALESCE(ul24.success, 0)::int AS success24,
             COALESCE(ul24.failed, 0)::int AS failed24,
             COALESCE(ul24.invalid, 0)::int AS invalid24,
             COALESCE(ul24.rate_limited, 0)::int AS "rateLimited24"
      FROM "IpRecord" r
      LEFT JOIN pvw ON pvw."ipHash" = r."ipHash"
      LEFT JOIN ulw ON ulw."ipHash" = r."ipHash"
      LEFT JOIN pv24 ON pv24."ipHash" = r."ipHash"
      LEFT JOIN ul24 ON ul24."ipHash" = r."ipHash"
      WHERE (r."blocked" OR pvw.views IS NOT NULL OR ulw.lookups IS NOT NULL)
        AND (${q} = '' OR r."ip" ILIKE ${like})
      ORDER BY (COALESCE(pvw.views, 0) + COALESCE(ulw.lookups, 0)) DESC, r."lastSeenAt" DESC
      LIMIT 500`;

    const all: IpRow[] = rows.map((r) => {
      const verdict = classifyIp(
        {
          requests: r.requests24,
          success: r.success24,
          failed: r.failed24,
          invalid: r.invalid24,
          rateLimited: r.rateLimited24,
        },
        thresholds,
        r.blocked,
      );
      return {
        ip: r.ip,
        views: r.views,
        lookups: r.lookups,
        requests: r.views + r.lookups,
        success: r.success,
        failed: r.failed,
        invalid: r.invalid,
        rateLimited: r.rateLimited,
        firstSeenAt: r.firstSeenAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
        blocked: r.blocked,
        blockedAt: r.blockedAt?.toISOString() ?? null,
        blockedReason: r.blockedReason,
        limitPerMinute: r.limitPerMinute,
        status: verdict.status,
        reasons: verdict.reasons,
      };
    });

    const counts = {
      all: all.length,
      suspicious: all.filter((r) => r.status === 'suspicious').length,
      blocked: all.filter((r) => r.status === 'blocked').length,
    };
    const filtered =
      args.filter === 'suspicious'
        ? all.filter((r) => r.status === 'suspicious')
        : args.filter === 'blocked'
          ? all.filter((r) => r.status === 'blocked')
          : all;
    const pageSize = 25;
    const page = Math.max(1, Math.floor(args.page ?? 1));
    return {
      from: w.from.toISOString(),
      to: w.to.toISOString(),
      page,
      pageSize,
      total: filtered.length,
      counts,
      truncated: rows.length >= 500,
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
    };
  }
}

