import { UidTargetType } from '../common/types';

export interface ParsedFacebookUrl {
  normalizedUrl: string;
  /** UID xác định ngay từ URL (không cần gọi mạng). */
  uid: string | null;
  /** Username/slug cần tra cứu nếu chưa có UID. */
  username: string | null;
  type: UidTargetType;
  /** true nếu URL là link rút gọn/chia sẻ cần theo redirect. */
  needsRedirect: boolean;
}

const FB_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'mbasic.facebook.com',
  'web.facebook.com',
  'fb.com',
  'www.fb.com',
  'fb.watch',
  'l.facebook.com',
]);

const RESERVED_SEGMENTS = new Set([
  'profile.php',
  'groups',
  'pages',
  'people',
  'share',
  'watch',
  'photo',
  'photo.php',
  'permalink.php',
  'story.php',
  'posts',
  'videos',
  'reel',
  'events',
  'marketplace',
  'login',
  'help',
  'policies',
  'privacy',
  'settings',
]);

export class InvalidFacebookUrlError extends Error {
  constructor(message = 'Đường dẫn Facebook không hợp lệ') {
    super(message);
    this.name = 'InvalidFacebookUrlError';
  }
}

export function isFacebookHost(hostname: string): boolean {
  return FB_HOSTS.has(hostname.toLowerCase());
}

export function parseFacebookUrl(input: string): ParsedFacebookUrl {
  const raw = (input ?? '').trim();
  if (!raw || raw.length > 2048) throw new InvalidFacebookUrlError();

  // Cho phép người dùng dán "facebook.com/abc" không có scheme.
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidFacebookUrlError();
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new InvalidFacebookUrlError();
  }
  if (!isFacebookHost(url.hostname)) {
    throw new InvalidFacebookUrlError('Chỉ hỗ trợ đường dẫn thuộc facebook.com');
  }

  url.protocol = 'https:';
  url.hash = '';
  const path = url.pathname.replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  const normalizedUrl = url.toString();

  const base = { normalizedUrl, needsRedirect: false };

  if (url.hostname === 'fb.watch' || url.hostname === 'l.facebook.com') {
    return { ...base, uid: null, username: null, type: 'SHARE', needsRedirect: true };
  }

  if (segments.length === 0) throw new InvalidFacebookUrlError();

  const first = segments[0].toLowerCase();

  // /share/p/xxx, /share/v/xxx, /share/xxx
  if (first === 'share') {
    return { ...base, uid: null, username: null, type: 'SHARE', needsRedirect: true };
  }

  // profile.php?id=123
  if (first === 'profile.php') {
    const id = url.searchParams.get('id');
    if (id && /^\d{5,}$/.test(id)) {
      return { ...base, uid: id, username: null, type: 'PROFILE' };
    }
    throw new InvalidFacebookUrlError();
  }

  // /groups/<id|slug>
  if (first === 'groups' && segments[1]) {
    const g = segments[1];
    if (/^\d{5,}$/.test(g)) {
      return { ...base, uid: g, username: null, type: 'GROUP' };
    }
    return { ...base, uid: null, username: g, type: 'GROUP' };
  }

  // /permalink.php?story_fbid=...&id=...  hoặc /story.php?story_fbid=...&id=...
  if (first === 'permalink.php' || first === 'story.php') {
    const story = url.searchParams.get('story_fbid');
    const owner = url.searchParams.get('id');
    if (story && /^\d+$/.test(story)) {
      return {
        ...base,
        uid: story,
        username: owner && /^\d+$/.test(owner) ? owner : null,
        type: 'POST',
      };
    }
    throw new InvalidFacebookUrlError();
  }

  // /<user>/posts/<postId>
  if (segments.length >= 3 && segments[1].toLowerCase() === 'posts') {
    const post = segments[2];
    if (/^\d+$/.test(post)) {
      return { ...base, uid: post, username: segments[0], type: 'POST' };
    }
    if (/^pfbid/i.test(post)) {
      // pfbid không phải ID số; cần tải trang để xác định.
      return { ...base, uid: null, username: segments[0], type: 'POST' };
    }
  }

  // /pages/<name>/<id>
  if (first === 'pages' && segments.length >= 3 && /^\d{5,}$/.test(segments[segments.length - 1])) {
    return {
      ...base,
      uid: segments[segments.length - 1],
      username: segments[1],
      type: 'PAGE',
    };
  }

  // /people/<name>/<id>
  if (first === 'people' && segments.length >= 3 && /^\d{5,}$/.test(segments[2])) {
    return { ...base, uid: segments[2], username: segments[1], type: 'PROFILE' };
  }

  // /<username>
  if (!RESERVED_SEGMENTS.has(first) && /^[A-Za-z0-9.\-_]{3,100}$/.test(segments[0])) {
    if (/^\d{5,}$/.test(segments[0])) {
      return { ...base, uid: segments[0], username: null, type: 'PROFILE' };
    }
    return { ...base, uid: null, username: segments[0], type: 'USERNAME' };
  }

  throw new InvalidFacebookUrlError('Không nhận diện được loại đường dẫn Facebook');
}
