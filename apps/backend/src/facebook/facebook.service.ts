import { Injectable } from '@nestjs/common';
import { assertSafeUrl } from './ssrf.guard';

export class FacebookBlockedError extends Error {
  constructor() {
    super('Facebook đang giới hạn truy cập, vui lòng thử lại sau');
    this.name = 'FacebookBlockedError';
  }
}

export class FacebookUpstreamError extends Error {
  constructor(message = 'Không thể kết nối tới Facebook') {
    super(message);
    this.name = 'FacebookUpstreamError';
  }
}

const MAX_REDIRECTS = 4;
const MAX_BODY_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

const UID_PATTERNS: RegExp[] = [
  /"entity_id"\s*:\s*"(\d{5,})"/,
  /"userID"\s*:\s*"(\d{5,})"/,
  /"pageID"\s*:\s*"(\d{5,})"/,
  /"profile_id"\s*:\s*"?(\d{5,})"?/,
  /fb:\/\/profile\/(\d{5,})/,
  /fb:\/\/page\/\?id=(\d{5,})/,
  /fb:\/\/group\/\?id=(\d{5,})/,
  /content="fb:\/\/(?:profile|page|group)\/(\d{5,})"/,
  /facebook\.com\/profile\.php\?id=(\d{5,})/,
];

@Injectable()
export class FacebookService {
  /** Theo redirect thủ công, mỗi chặng đều kiểm tra SSRF. Trả về URL cuối cùng. */
  async resolveRedirect(startUrl: string): Promise<string> {
    let current = startUrl;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const safe = await assertSafeUrl(current);
      const res = await this.request(safe.toString(), 'HEAD').catch(() =>
        this.request(safe.toString(), 'GET'),
      );
      this.throwIfBlocked(res.status);
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, safe).toString();
        continue;
      }
      return safe.toString();
    }
    throw new FacebookUpstreamError('Quá nhiều lần chuyển hướng');
  }

  /** Tải trang công khai và tìm UID trong nội dung HTML. Không đăng nhập, không cookie. */
  async extractUidFromPage(pageUrl: string): Promise<string | null> {
    let current = pageUrl;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const safe = await assertSafeUrl(current);
      const res = await this.request(safe.toString(), 'GET');
      this.throwIfBlocked(res.status);

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, safe).toString();
        continue;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new FacebookUpstreamError();

      const html = await this.readLimited(res);
      for (const pattern of UID_PATTERNS) {
        const m = html.match(pattern);
        if (m?.[1]) return m[1];
      }
      return null;
    }
    throw new FacebookUpstreamError('Quá nhiều lần chuyển hướng');
  }

  private throwIfBlocked(status: number): void {
    if (status === 429 || status === 403) throw new FacebookBlockedError();
  }

  private async request(url: string, method: 'GET' | 'HEAD'): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent':
            'Mozilla/5.0 (compatible; UIDFinderBot/1.0; +https://uidfinder.example.com)',
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'vi,en;q=0.8',
        },
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new FacebookUpstreamError('Facebook phản hồi quá chậm');
      }
      throw new FacebookUpstreamError();
    } finally {
      clearTimeout(timer);
    }
  }

  private async readLimited(res: Response): Promise<string> {
    if (!res.body) return '';
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      chunks.push(value);
      if (total >= MAX_BODY_BYTES) {
        await reader.cancel();
        break;
      }
    }
    return Buffer.concat(chunks).toString('utf8');
  }
}
