import { RelatedId, UidTargetType } from '../common/types';

export interface ParsedFacebookUrl {
  normalizedUrl: string;
  /** ID xác định ngay từ link (không cần gọi mạng). null nếu phải tải trang Facebook. */
  uid: string | null;
  /** Username/slug (nếu có trong link). */
  username: string | null;
  type: UidTargetType;
  /** true nếu link là link rút gọn/chia sẻ cần theo chuyển hướng. */
  needsRedirect: boolean;
  /** ID liên quan: nhóm chứa bài viết, chủ sở hữu... */
  related: RelatedId | null;
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

/** Các đường dẫn đầu tiên KHÔNG phải là username. */
const RESERVED_SEGMENTS = new Set([
  'profile.php',
  'groups',
  'pages',
  'people',
  'share',
  'watch',
  'photo',
  'photo.php',
  'photos',
  'permalink.php',
  'story.php',
  'stories',
  'posts',
  'videos',
  'reel',
  'reels',
  'p',
  'media',
  'hashtag',
  'gaming',
  'events',
  'marketplace',
  'login',
  'login.php',
  'dialog',
  'sharer',
  'sharer.php',
  'l.php',
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

const isId = (s: string | null | undefined): s is string => !!s && /^\d{5,}$/.test(s);
const isPfbid = (s: string | null | undefined): s is string => !!s && /^pfbid/i.test(s);
const owner = (s: string | null | undefined): RelatedId | null =>
  isId(s) ? { id: s, role: 'OWNER' } : null;

export function parseFacebookUrl(input: string, depth = 0): ParsedFacebookUrl {
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
  const segments = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const normalizedUrl = url.toString();

  const make = (
    type: UidTargetType,
    uid: string | null,
    extra: { username?: string | null; related?: RelatedId | null; needsRedirect?: boolean } = {},
  ): ParsedFacebookUrl => ({
    normalizedUrl,
    uid,
    type,
    username: extra.username ?? null,
    related: extra.related ?? null,
    needsRedirect: extra.needsRedirect ?? false,
  });

  if (url.hostname === 'fb.watch' || url.hostname === 'l.facebook.com') {
    return make('SHARE', null, { needsRedirect: true });
  }

  if (segments.length === 0) throw new InvalidFacebookUrlError();

  const first = segments[0].toLowerCase();
  const second = (segments[1] ?? '').toLowerCase();
  const q = (name: string) => url.searchParams.get(name);

  // Facebook đôi khi chuyển về trang đăng nhập kèm ?next=<link gốc>: lấy lại link gốc.
  if (first === 'login' || first === 'login.php') {
    const next = q('next');
    if (next && depth === 0) {
      return parseFacebookUrl(next.startsWith('/') ? `https://www.facebook.com${next}` : next, 1);
    }
    throw new InvalidFacebookUrlError();
  }

  // /share/p/xxx, /share/r/xxx, /share/v/xxx, /share/g/xxx ...
  if (first === 'share') {
    return make('SHARE', null, { needsRedirect: true });
  }

  // /watch/?v=123
  if (first === 'watch') {
    const v = q('v');
    if (isId(v)) return make('VIDEO', v);
    throw new InvalidFacebookUrlError();
  }

  // /reel/123
  if (first === 'reel' || first === 'reels') {
    if (isId(segments[1])) return make('REEL', segments[1]);
    throw new InvalidFacebookUrlError();
  }

  // /photo.php?fbid=123  hoặc  /photo/?fbid=123
  if (first === 'photo' || first === 'photo.php') {
    const fbid = q('fbid');
    if (isId(fbid)) return make('PHOTO', fbid, { related: owner(q('id')) });
    throw new InvalidFacebookUrlError();
  }

  // profile.php?id=123
  if (first === 'profile.php') {
    const id = q('id');
    if (isId(id)) return make('PROFILE', id);
    throw new InvalidFacebookUrlError();
  }

  // /groups/<id|slug>[/posts|permalink/<postId>] [/user/<memberId>]
  if (first === 'groups' && segments[1]) {
    const g = segments[1];
    const groupRel: RelatedId | null = isId(g) ? { id: g, role: 'GROUP' } : null;

    // segments[2] là tên mục con (user, posts, permalink...), segments[3] là ID
    const sub = (segments[2] ?? '').toLowerCase();
    if ((sub === 'posts' || sub === 'permalink') && segments[3]) {
      const p = segments[3];
      if (isId(p)) return make('POST', p, { related: groupRel });
      if (isPfbid(p)) return make('POST', null, { related: groupRel });
    }
    if (sub === 'user' && isId(segments[3])) {
      return make('PROFILE', segments[3], { related: groupRel });
    }
    const multi = q('multi_permalinks') ?? q('story_fbid');
    if (isId(multi)) return make('POST', multi, { related: groupRel });

    if (isId(g)) return make('GROUP', g);
    return make('GROUP', null, { username: g });
  }

  // /permalink.php?story_fbid=...&id=...  hoặc  /story.php?story_fbid=...&id=...
  if (first === 'permalink.php' || first === 'story.php') {
    const story = q('story_fbid');
    const rel = owner(q('id'));
    if (isId(story)) return make('POST', story, { related: rel });
    if (isPfbid(story)) return make('POST', null, { related: rel });
    throw new InvalidFacebookUrlError();
  }

  // /p/Ten-Trang-100064123456789  (dạng link Page mới, ID nằm cuối)
  if (first === 'p' && segments[1]) {
    const m = segments[1].match(/-(\d{8,})$/);
    if (m) return make('PAGE', m[1]);
  }

  // /pages/<name>/<id>
  if (first === 'pages' && segments.length >= 3 && isId(segments[segments.length - 1])) {
    return make('PAGE', segments[segments.length - 1], { username: segments[1] });
  }

  // /people/<name>/<id>
  if (first === 'people' && segments.length >= 3 && isId(segments[2])) {
    return make('PROFILE', segments[2], { username: segments[1] });
  }

  // /<user>/posts/<id|pfbid...>, /<user>/photos/<...>/<id>, /<user>/videos/<...>/<id>
  if (segments.length >= 3 && !RESERVED_SEGMENTS.has(first)) {
    const ownerRel = owner(segments[0]);
    const name = isId(segments[0]) ? null : segments[0];
    const last = segments[segments.length - 1];

    if (second === 'posts') {
      const p = segments[2];
      if (isId(p)) return make('POST', p, { username: name, related: ownerRel });
      if (isPfbid(p)) return make('POST', null, { username: name, related: ownerRel });
    }
    if (second === 'photos' && isId(last)) {
      return make('PHOTO', last, { username: name, related: ownerRel });
    }
    if (second === 'videos' && isId(last)) {
      return make('VIDEO', last, { username: name, related: ownerRel });
    }
  }

  // /<username>  hoặc  /<số id>
  if (!RESERVED_SEGMENTS.has(first) && /^[A-Za-z0-9.\-_]{3,100}$/.test(segments[0])) {
    if (isId(segments[0])) return make('PROFILE', segments[0]);
    return make('USERNAME', null, { username: segments[0] });
  }

  throw new InvalidFacebookUrlError('Không nhận diện được loại đường dẫn Facebook');
}
