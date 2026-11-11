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
    ipHash?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.pageView.create({
      data: {
        path: args.path.slice(0, 300),
        visitorHash: args.visitorHash,
        ipHash: args.ipHash,
        sessionId: args.sessionId.slice(0, 64),
        referrer: args.referrer?.slice(0, 500),
        source: detectSource(args.referrer),
        device: detectDevice(args.userAgent),
      },
    });
  }
}
