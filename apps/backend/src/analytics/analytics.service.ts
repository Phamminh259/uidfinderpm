import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const VN_OFFSET_MS = 7 * 3600_000;

/** Thời điểm 00:00 (giờ Việt Nam) của ngày hiện tại lùi `daysAgo` ngày, trả về dạng UTC. */
export function startOfDayVN(daysAgo = 0, now = new Date()): Date {
  const local = new Date(now.getTime() + VN_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - VN_OFFSET_MS - daysAgo * 86400_000);
}

export function detectSource(referrer: string | undefined | null): string {
  if (!referrer) return 'direct';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  if (host.includes('google.')) return 'google';
  if (host.includes('facebook.') || host === 'fb.com' || host.endsWith('.fb.com') || host === 'l.facebook.com') return 'facebook';
  if (host.includes('tiktok.')) return 'tiktok';
  if (host.includes('bing.') || host.includes('duckduckgo.') || host.includes('coccoc.')) return 'search-other';
  return 'other';
}

export function detectDevice(ua: string | undefined): string {
  const s = (ua ?? '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s) || (/android/.test(s) && !/mobile/.test(s))) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone/.test(s)) return 'mobile';
  return 'desktop';
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async collect(args: {
    path: string;
    referrer?: string;
    sessionId: string;
    visitorHash: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.pageView.create({
      data: {
        path: args.path.slice(0, 300),
        visitorHash: args.visitorHash,
        sessionId: args.sessionId.slice(0, 64),
        referrer: args.referrer?.slice(0, 500),
        source: detectSource(args.referrer),
        device: detectDevice(args.userAgent),
      },
    });
  }

  async traffic() {
    const today = startOfDayVN(0);
    const yesterday = startOfDayVN(1);
    const d7 = startOfDayVN(6);
    const d30 = startOfDayVN(29);

    const [viewsToday, viewsYesterday, views7, views30, total, visitors, sessions, sources, devices, series] =
      await Promise.all([
        this.prisma.pageView.count({ where: { createdAt: { gte: today } } }),
        this.prisma.pageView.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
        this.prisma.pageView.count({ where: { createdAt: { gte: d7 } } }),
        this.prisma.pageView.count({ where: { createdAt: { gte: d30 } } }),
        this.prisma.pageView.count(),
        this.prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(DISTINCT "visitorHash")::int AS n FROM "PageView"`,
        this.prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(DISTINCT "sessionId")::int AS n FROM "PageView"`,
        this.prisma.pageView.groupBy({ by: ['source'], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
        this.prisma.pageView.groupBy({ by: ['device'], _count: { _all: true }, where: { createdAt: { gte: d30 } } }),
        this.prisma.$queryRaw<{ day: string; views: number; visitors: number }[]>`
          SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day,
                 COUNT(*)::int AS views,
                 COUNT(DISTINCT "visitorHash")::int AS visitors
          FROM "PageView"
          WHERE "createdAt" >= ${d30}
          GROUP BY 1
          ORDER BY 1`,
      ]);

    return {
      viewsToday,
      viewsYesterday,
      views7Days: views7,
      views30Days: views30,
      totalViews: total,
      estimatedVisitors: visitors[0]?.n ?? 0,
      sessions: sessions[0]?.n ?? 0,
      sources: sources.map((s) => ({ source: s.source, count: s._count._all })),
      devices: devices.map((d) => ({ device: d.device, count: d._count._all })),
      series,
    };
  }

  async uidStats() {
    const [total, success, failed, rateLimited, invalid, byType] = await Promise.all([
      this.prisma.uidLookup.count(),
      this.prisma.uidLookup.count({ where: { status: 'SUCCESS' } }),
      this.prisma.uidLookup.count({ where: { status: 'FAILED' } }),
      this.prisma.uidLookup.count({ where: { status: 'RATE_LIMITED' } }),
      this.prisma.uidLookup.count({ where: { status: 'INVALID' } }),
      this.prisma.uidLookup.groupBy({
        by: ['targetType'],
        _count: { _all: true },
        where: { status: 'SUCCESS' },
        orderBy: { _count: { targetType: 'desc' } },
      }),
    ]);
    const attempts = success + failed;
    return {
      total,
      success,
      failed,
      invalid,
      rateLimited,
      successRate: attempts > 0 ? Math.round((success / attempts) * 1000) / 10 : null,
      byType: byType.map((t) => ({ type: t.targetType, count: t._count._all })),
    };
  }
}
