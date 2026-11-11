/** Loại đối tượng trả về cho người dùng (API). */
export type UidTargetType =
  | 'PROFILE'
  | 'USERNAME'
  | 'PAGE'
  | 'GROUP'
  | 'POST'
  | 'SHARE'
  | 'REEL'
  | 'PHOTO'
  | 'VIDEO'
  | 'UNKNOWN';

/** Loại được lưu trong database (enum Prisma `UidTargetType`). Không thêm giá trị mới để khỏi phải migrate. */
export type DbTargetType = 'PROFILE' | 'USERNAME' | 'PAGE' | 'GROUP' | 'POST' | 'SHARE' | 'UNKNOWN';

/** Reel, ảnh, video được tính chung vào POST trong thống kê. */
export function toDbTargetType(t: UidTargetType): DbTargetType {
  return t === 'REEL' || t === 'PHOTO' || t === 'VIDEO' ? 'POST' : t;
}

export interface RelatedId {
  id: string;
  /** GROUP: ID nhóm chứa bài viết. OWNER: ID chủ sở hữu (trang/người đăng). */
  role: 'GROUP' | 'OWNER';
}

export interface UidResult {
  uid: string;
  url: string;
  username: string | null;
  type: UidTargetType;
  related: RelatedId | null;
  cached: boolean;
}

export const UID_ERROR_CODES = {
  INVALID_URL: 'INVALID_URL',
  HOST_NOT_ALLOWED: 'HOST_NOT_ALLOWED',
  NOT_FOUND: 'UID_NOT_FOUND',
  FB_BLOCKED: 'FACEBOOK_RATE_LIMITED',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
} as const;
