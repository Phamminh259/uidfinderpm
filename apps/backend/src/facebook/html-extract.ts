import { UidTargetType } from '../common/types';
import { parseFacebookUrl } from './url-parser';

export interface Extracted {
  id: string;
  /** Tên mẫu đã khớp, dùng để chẩn đoán. */
  pattern: string;
}

interface Rule {
  name: string;
  re: RegExp;
}

const raw = (name: string, re: RegExp): Rule => ({ name, re });

/** Khóa JSON, chấp nhận cả dạng thoát \" và giá trị có/không có ngoặc kép hoặc nằm trong mảng. */
const key = (k: string): Rule => ({
  name: `json:${k}`,
  re: new RegExp(`\\\\?"${k}\\\\?"\\s*:\\s*\\[?\\s*\\\\?"?(\\d{5,})\\b`),
});

// Trang cá nhân / Page / username: giữ nguyên thứ tự mẫu đã dùng ổn định, mẫu mới chỉ thêm phía sau.
const PROFILE_RULES: Rule[] = [
  raw('json:entity_id', /"entity_id"\s*:\s*"(\d{5,})"/),
  raw('json:userID', /"userID"\s*:\s*"(\d{5,})"/),
  raw('json:pageID', /"pageID"\s*:\s*"(\d{5,})"/),
  raw('json:profile_id', /"profile_id"\s*:\s*"?(\d{5,})"?/),
  raw('fb://profile', /fb:\/\/profile\/(\d{5,})/),
  raw('fb://page?id', /fb:\/\/page\/\?id=(\d{5,})/),
  raw('fb://group?id', /fb:\/\/group\/\?id=(\d{5,})/),
  raw('meta fb://', /content="fb:\/\/(?:profile|page|group)\/(\d{5,})"/),
  raw('profile.php?id', /facebook\.com\/profile\.php\?id=(\d{5,})/),
  key('entity_id'),
  key('pageID'),
  key('profile_id'),
  raw('fb://page/id', /fb:\/\/page\/(\d{5,})/),
];

// Nhóm: KHÔNG dùng mẫu của trang cá nhân (profile.php?id, fb://profile, userID...) vì trang nhóm
// chứa nhiều link tới thành viên, sẽ trả nhầm ID của một thành viên làm ID nhóm.
const GROUP_RULES: Rule[] = [
  key('groupID'),
  key('group_id'),
  key('groupid'),
  key('groupId'),
  raw('fb://group/id', /fb:\/\/group\/(\d{5,})/),
  raw('fb://group?id', /fb:\/\/group\/\?id=(\d{5,})/),
  raw('meta fb://group', /content="fb:\/\/group\/(\d{5,})"/),
  raw('json:entity_id', /"entity_id"\s*:\s*"(\d{5,})"/),
  key('entity_id'),
  // Ưu tiên thấp nhất: đối tượng kiểu Group trong dữ liệu trang (lấy khớp đầu tiên).
  raw('json:Group.id', /\\?"__typename\\?"\s*:\s*\\?"Group\\?"\s*,\s*\\?"id\\?"\s*:\s*\\?"(\d{8,})\\?"/),
  raw('json:id.Group', /\\?"id\\?"\s*:\s*\\?"(\d{8,})\\?"\s*,\s*\\?"__typename\\?"\s*:\s*\\?"Group\\?"/),
];

const POST_RULES: Rule[] = [
  key('top_level_post_id'),
  key('post_id'),
  key('mf_story_key'),
  key('story_fbid'),
  raw('fb://post', /fb:\/\/post\/(\d{5,})/),
];

const VIDEO_RULES: Rule[] = [
  key('video_id'),
  key('videoID'),
  key('videoId'),
  raw('fb://video', /fb:\/\/video\/(\d{5,})/),
];

const PHOTO_RULES: Rule[] = [
  key('photo_id'),
  key('photoID'),
  key('fbid'),
  raw('fb://photo', /fb:\/\/photo\/(\d{5,})/),
];

/** Với mỗi loại, link chuẩn (canonical/og:url) chỉ được chấp nhận nếu cùng họ loại. */
const ACCEPT: Record<UidTargetType, UidTargetType[]> = {
  PROFILE: ['PROFILE', 'PAGE'],
  USERNAME: ['PROFILE', 'PAGE'],
  PAGE: ['PROFILE', 'PAGE'],
  GROUP: ['GROUP'],
  POST: ['POST'],
  REEL: ['REEL', 'VIDEO'],
  VIDEO: ['VIDEO', 'REEL'],
  PHOTO: ['PHOTO'],
  SHARE: ['POST', 'REEL', 'VIDEO', 'PHOTO', 'PROFILE', 'PAGE', 'GROUP'],
  UNKNOWN: ['POST', 'REEL', 'VIDEO', 'PHOTO', 'PROFILE', 'PAGE', 'GROUP'],
};

const CANONICAL_RES: RegExp[] = [
  /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
  /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i,
  /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:url["']/i,
];

function rulesFor(type: UidTargetType): Rule[] {
  switch (type) {
    case 'GROUP':
      return GROUP_RULES;
    case 'POST':
      // Không dùng mẫu của trang cá nhân: sẽ trả nhầm ID chủ bài viết thay vì ID bài viết.
      return POST_RULES;
    case 'REEL':
    case 'VIDEO':
      return VIDEO_RULES;
    case 'PHOTO':
      return PHOTO_RULES;
    case 'SHARE':
    case 'UNKNOWN':
      return [...POST_RULES, ...VIDEO_RULES];
    default:
      return PROFILE_RULES;
  }
}

/** Link tìm thấy (canonical hoặc địa chỉ sau chuyển hướng) có cùng họ loại với loại đang tìm không. */
export function idFromUrl(href: string, type: UidTargetType): Extracted | null {
  try {
    const parsed = parseFacebookUrl(href);
    if (parsed.uid && ACCEPT[type].includes(parsed.type)) return { id: parsed.uid, pattern: 'redirect-url' };
  } catch {
    // không nhận diện được: bỏ qua
  }
  return null;
}

function fromCanonical(html: string, type: UidTargetType): Extracted | null {
  const accepted = ACCEPT[type];
  for (const re of CANONICAL_RES) {
    const href = html.match(re)?.[1]?.replace(/&amp;/g, '&');
    if (!href) continue;
    try {
      const parsed = parseFacebookUrl(href);
      if (parsed.uid && accepted.includes(parsed.type)) {
        return { id: parsed.uid, pattern: 'canonical/og:url' };
      }
    } catch {
      // canonical không nhận diện được: bỏ qua
    }
  }
  return null;
}

/**
 * Tìm ID trong HTML công khai của trang Facebook.
 * Đây là phương pháp suy đoán dựa trên dữ liệu trang trả về; Facebook có thể thay đổi bất cứ lúc nào.
 */
export function extractIdFromHtml(html: string, type: UidTargetType): Extracted | null {
  const canonical = fromCanonical(html, type);
  if (canonical) return canonical;

  for (const rule of rulesFor(type)) {
    const m = html.match(rule.re);
    if (m?.[1]) return { id: m[1], pattern: rule.name };
  }
  return null;
}
