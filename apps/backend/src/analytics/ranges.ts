import { BadRequestException } from '@nestjs/common';
import { startOfDayVN } from './analytics.service';

export type RangeKey = 'today' | '2h' | '24h' | '7d' | '30d' | 'custom';

export interface TimeWindow {
  from: Date;
  /** Điểm cuối loại trừ (createdAt < to). */
  to: Date;
}

const VN_OFFSET_MS = 7 * 3600_000;
const DAY_MS = 86400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_CUSTOM_DAYS = 366;

/** 00:00 giờ Việt Nam của ngày YYYY-MM-DD, trả về dạng UTC. Ném lỗi nếu ngày không tồn tại. */
export function vnDayStart(dateStr: string): Date {
  if (!DATE_RE.test(dateStr)) throw new BadRequestException('Ngày không hợp lệ, cần dạng YYYY-MM-DD');
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime()) || vnDateString(d) !== dateStr) {
    throw new BadRequestException(`Ngày không tồn tại: ${dateStr}`);
  }
  return d;
}

/** Ngày (giờ Việt Nam) của một thời điểm, dạng YYYY-MM-DD. */
export function vnDateString(d: Date): string {
  return new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function windowFor(key: RangeKey, now = new Date(), from?: string, to?: string): TimeWindow {
  switch (key) {
    case '2h':
      return { from: new Date(now.getTime() - 2 * 3600_000), to: new Date(now.getTime() + 1) };
    case '24h':
      return { from: new Date(now.getTime() - 24 * 3600_000), to: new Date(now.getTime() + 1) };
    case 'today':
      return { from: startOfDayVN(0, now), to: new Date(now.getTime() + 1) };
    case '7d':
      return { from: startOfDayVN(6, now), to: new Date(now.getTime() + 1) };
    case '30d':
      return { from: startOfDayVN(29, now), to: new Date(now.getTime() + 1) };
    case 'custom': {
      if (!from || !to) throw new BadRequestException('Cần chọn ngày bắt đầu và ngày kết thúc');
      const start = vnDayStart(from);
      const end = new Date(vnDayStart(to).getTime() + DAY_MS);
      if (end <= start) throw new BadRequestException('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      if ((end.getTime() - start.getTime()) / DAY_MS > MAX_CUSTOM_DAYS) {
        throw new BadRequestException(`Khoảng thời gian tối đa ${MAX_CUSTOM_DAYS} ngày`);
      }
      return { from: start, to: end };
    }
    default:
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
  }
}

/** Danh sách `days` ngày (giờ Việt Nam) kết thúc ở hôm nay, cũ nhất trước. */
export function lastDays(days: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(vnDateString(startOfDayVN(i, now)));
  return out;
}
