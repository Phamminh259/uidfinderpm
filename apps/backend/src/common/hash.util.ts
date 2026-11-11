import { createHash } from 'crypto';

export function hashWithSalt(value: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

/** Chuẩn hóa để cùng một địa chỉ luôn có cùng một dạng (bỏ tiền tố IPv4-mapped, chữ thường). */
export function normalizeIp(ip: string): string {
  const v = ip.trim().toLowerCase();
  return v.startsWith('::ffff:') && v.includes('.') ? v.slice(7) : v;
}

export function clientIp(req: {
  headers: Record<string, unknown>;
  ip?: string;
}): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return normalizeIp(fwd.split(',')[0]);
  }
  return normalizeIp(req.ip ?? 'unknown');
}
