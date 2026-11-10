import { createHash } from 'crypto';

export function hashWithSalt(value: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export function clientIp(req: {
  headers: Record<string, unknown>;
  ip?: string;
}): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}
