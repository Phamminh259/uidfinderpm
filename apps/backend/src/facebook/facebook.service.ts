import { Injectable } from '@nestjs/common';
import { UidTargetType } from '../common/types';
import { extractIdFromHtml } from './html-extract';
import { assertSafeUrl, SsrfBlockedError } from './ssrf.guard';

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

/** Một lần tải trang Facebook, dùng để chẩn đoán khi không lấy được ID. */
export interface FetchAttempt {
  url: string;
  status: number | null;
  /** Địa chỉ cuối cùng sau chuyển hướng (chỉ host và đường dẫn). */
  finalUrl: string | null;
  bytes: number;
  /** ok | blocked | not-found | login-wall | http-xxx | redirect-blocked | too-many-redirects | timeout | network */
  note: string;
  matched: string | null;
}

export interface FindResult {
  uid: string | null;
  attempts: FetchAttempt[];
}

const MAX_REDIRECTS = 4;
const MAX_BODY_BYTES = 1_500_000;
const TIMEOUT_MS = 6000;
/** Tổng thời gian tối đa cho mọi lần thử của một lượt tra cứu (Nginx chờ tối đa 30 giây). */
const TOTAL_BUDGET_MS = 20_000;

@Injectable()
export class FacebookService {
  /** Theo chuyển hướng thủ công, mỗi chặng đều kiểm tra SSRF. Trả về URL cuối cùng. */
  async resolveRedirect(startUrl: string): Promise<string> {
    let current = startUrl;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const safe = await assertSafeUrl(current);
      const res = await this.request(safe.toString(), 'HEAD').catch(() =>
        this.request(safe.toString(), 'GET'),
      );
      if (res.status === 429 || res.status === 403) throw new FacebookBlockedError();
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, safe).toString();
        continue;
      }
      return safe.toString();
    }
    throw new FacebookUpstreamError('Quá nhiều lần chuyển hướng');
  }

  /**
   * Tải trang công khai và tìm ID trong HTML. Không đăng nhập, không cookie.
   * Thử lần lượt bản www, m và mbasic của cùng một đường dẫn; dừng ngay khi tìm thấy.
   */
  async findId(pageUrl: string, type: UidTargetType): Promise<FindResult> {
    const attempts: FetchAttempt[] = [];
    const deadline = Date.now() + TOTAL_BUDGET_MS;
    let sawContent = false;
    let sawBlock = false;
    let sawNetworkError = false;

    for (const candidate of this.candidates(pageUrl)) {
      if (Date.now() > deadline) break;
      const attempt: FetchAttempt = {
        url: candidate,
        status: null,
        finalUrl: null,
        bytes: 0,
        note: 'ok',
        matched: null,
      };
      attempts.push(attempt);

      try {
        const html = await this.fetchHtml(candidate, attempt, deadline);
        if (html === null) continue;
        sawContent = true;
        const hit = extractIdFromHtml(html, type);
        if (hit) {
          attempt.matched = hit.pattern;
          return { uid: hit.id, attempts };
        }
      } catch (err) {
        if (err instanceof FacebookBlockedError) sawBlock = true;
        else if (err instanceof SsrfBlockedError) attempt.note = 'redirect-blocked';
        else sawNetworkError = true;
      }
    }

    if (sawContent) return { uid: null, attempts };
    if (sawBlock) throw new FacebookBlockedError();
    if (sawNetworkError) throw new FacebookUpstreamError();
    return { uid: null, attempts };
  }

  private candidates(pageUrl: string): string[] {
    const url = new URL(pageUrl);
    const out = [url.toString()];
    for (const host of ['m.facebook.com', 'mbasic.facebook.com']) {
      if (url.hostname !== host) {
        const u = new URL(url.toString());
        u.hostname = host;
        out.push(u.toString());
      }
    }
    return out;
  }

  private async fetchHtml(
    startUrl: string,
    attempt: FetchAttempt,
    deadline: number,
  ): Promise<string | null> {
    let current = startUrl;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      if (Date.now() > deadline) {
        attempt.note = 'timeout';
        throw new FacebookUpstreamError('Facebook phản hồi quá chậm');
      }
      const safe = await assertSafeUrl(current);
      attempt.finalUrl = `${safe.hostname}${safe.pathname}`;

      let res: Response;
      try {
        res = await this.request(safe.toString(), 'GET');
      } catch (err) {
        attempt.note = err instanceof FacebookUpstreamError && /chậm/.test(err.message) ? 'timeout' : 'network';
        throw err;
      }
      attempt.status = res.status;

      if (res.status === 429 || res.status === 403) {
        attempt.note = 'blocked';
        throw new FacebookBlockedError();
      }
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, safe).toString();
        continue;
      }
      if (res.status === 404) {
        attempt.note = 'not-found';
        return null;
      }
      if (!res.ok) {
        attempt.note = `http-${res.status}`;
        throw new FacebookUpstreamError();
      }

      const html = await this.readLimited(res);
      attempt.bytes = html.length;
      if (/^\/(login|checkpoint)(\/|\.php|$)/.test(safe.pathname)) attempt.note = 'login-wall';
      return html;
    }
    attempt.note = 'too-many-redirects';
    throw new FacebookUpstreamError('Quá nhiều lần chuyển hướng');
  }

  private async request(url: string, method: 'GET' | 'HEAD'): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const site = process.env.PUBLIC_SITE_URL || 'https://uidfinder.site';
    try {
      return await fetch(url, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          // Khai báo trung thực danh tính; không giả làm trình duyệt hay bot của Facebook.
          'user-agent': `Mozilla/5.0 (compatible; UIDFinderBot/1.0; +${site})`,
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
