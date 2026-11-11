export interface IpActivity24h {
  /** Lượt xem trang + lượt tra cứu UID trong 24 giờ. */
  requests: number;
  success: number;
  failed: number;
  invalid: number;
  rateLimited: number;
}

export interface SuspicionThresholds {
  requestsPerDay: number;
  rateLimitedHits: number;
  invalidHits: number;
  failPercent: number;
  /** Số lượt thành công+thất bại tối thiểu trước khi xét tỉ lệ thất bại. */
  failMinAttempts: number;
}

export const DEFAULT_THRESHOLDS: SuspicionThresholds = {
  requestsPerDay: 500,
  rateLimitedHits: 5,
  invalidHits: 30,
  failPercent: 80,
  failMinAttempts: 20,
};

export type IpStatus = 'normal' | 'suspicious' | 'blocked';

/** Tự động đánh giá IP dựa trên hoạt động 24 giờ gần nhất. Trả về lý do để quản trị viên kiểm tra. */
export function classifyIp(
  a: IpActivity24h,
  t: SuspicionThresholds,
  blocked: boolean,
): { status: IpStatus; reasons: string[] } {
  if (blocked) return { status: 'blocked', reasons: [] };
  const reasons: string[] = [];
  if (t.requestsPerDay > 0 && a.requests >= t.requestsPerDay) {
    reasons.push(`${a.requests} request trong 24 giờ (ngưỡng ${t.requestsPerDay})`);
  }
  if (t.rateLimitedHits > 0 && a.rateLimited >= t.rateLimitedHits) {
    reasons.push(`${a.rateLimited} lần bị giới hạn tốc độ (ngưỡng ${t.rateLimitedHits})`);
  }
  if (t.invalidHits > 0 && a.invalid >= t.invalidHits) {
    reasons.push(`${a.invalid} URL không hợp lệ (ngưỡng ${t.invalidHits})`);
  }
  const attempts = a.success + a.failed;
  if (t.failPercent > 0 && attempts >= t.failMinAttempts && (a.failed / attempts) * 100 >= t.failPercent) {
    reasons.push(`${Math.round((a.failed / attempts) * 100)}% tra cứu thất bại trên ${attempts} lượt`);
  }
  return { status: reasons.length > 0 ? 'suspicious' : 'normal', reasons };
}
