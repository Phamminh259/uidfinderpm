import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { isFacebookHost } from './url-parser';

export class SsrfBlockedError extends Error {
  constructor(message = 'Địa chỉ đích không được phép truy cập') {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true; // ULA
  if (v.startsWith('fe80')) return true; // link-local
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

/**
 * Kiểm tra URL trước khi gọi mạng: chỉ https, chỉ host Facebook,
 * không có thông tin đăng nhập trong URL, và DNS không trỏ về IP nội bộ.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError();
  }

  if (url.protocol !== 'https:') throw new SsrfBlockedError();
  if (url.username || url.password) throw new SsrfBlockedError();
  if (url.port && url.port !== '443') throw new SsrfBlockedError();
  if (!isFacebookHost(url.hostname)) throw new SsrfBlockedError();

  const records = await lookup(url.hostname, { all: true });
  if (records.length === 0) throw new SsrfBlockedError();
  for (const r of records) {
    if (isPrivateAddress(r.address)) throw new SsrfBlockedError();
  }
  return url;
}
