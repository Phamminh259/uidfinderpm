export type UidTargetType =
  | 'PROFILE'
  | 'USERNAME'
  | 'PAGE'
  | 'GROUP'
  | 'POST'
  | 'SHARE'
  | 'UNKNOWN';

export interface UidResult {
  uid: string;
  url: string;
  username: string | null;
  type: UidTargetType;
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
