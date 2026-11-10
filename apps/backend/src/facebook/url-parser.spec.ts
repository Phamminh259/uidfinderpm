import { InvalidFacebookUrlError, parseFacebookUrl } from './url-parser';

describe('parseFacebookUrl', () => {
  it('đọc UID từ profile.php?id=', () => {
    const r = parseFacebookUrl('https://www.facebook.com/profile.php?id=100012345678901');
    expect(r.uid).toBe('100012345678901');
    expect(r.type).toBe('PROFILE');
  });

  it('nhận diện username và cần tra cứu', () => {
    const r = parseFacebookUrl('facebook.com/zuck');
    expect(r.uid).toBeNull();
    expect(r.username).toBe('zuck');
    expect(r.type).toBe('USERNAME');
  });

  it('đọc ID nhóm dạng số', () => {
    const r = parseFacebookUrl('https://facebook.com/groups/123456789012345/');
    expect(r.uid).toBe('123456789012345');
    expect(r.type).toBe('GROUP');
  });

  it('đọc ID bài viết', () => {
    const r = parseFacebookUrl('https://www.facebook.com/someone/posts/1234567890');
    expect(r.uid).toBe('1234567890');
    expect(r.type).toBe('POST');
  });

  it('đánh dấu link share cần redirect', () => {
    const r = parseFacebookUrl('https://www.facebook.com/share/p/abc123/');
    expect(r.needsRedirect).toBe(true);
    expect(r.type).toBe('SHARE');
  });

  it('từ chối host không phải Facebook', () => {
    expect(() => parseFacebookUrl('https://evil.com/facebook.com/x')).toThrow(
      InvalidFacebookUrlError,
    );
  });

  it('từ chối chuỗi rỗng và scheme lạ', () => {
    expect(() => parseFacebookUrl('')).toThrow(InvalidFacebookUrlError);
    expect(() => parseFacebookUrl('ftp://facebook.com/abc')).toThrow(InvalidFacebookUrlError);
  });
});
