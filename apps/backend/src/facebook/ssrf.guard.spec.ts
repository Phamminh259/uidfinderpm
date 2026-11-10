import { assertSafeUrl, isPrivateAddress, SsrfBlockedError } from './ssrf.guard';

describe('ssrf guard', () => {
  it('nhận diện IP nội bộ', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true);
    expect(isPrivateAddress('10.1.2.3')).toBe(true);
    expect(isPrivateAddress('192.168.1.5')).toBe(true);
    expect(isPrivateAddress('172.20.0.1')).toBe(true);
    expect(isPrivateAddress('169.254.169.254')).toBe(true);
    expect(isPrivateAddress('::1')).toBe(true);
    expect(isPrivateAddress('fd00::1')).toBe(true);
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
  });

  it('chặn host không phải Facebook mà không cần gọi DNS', async () => {
    await expect(assertSafeUrl('https://example.com/')).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('chặn http, credential và cổng lạ', async () => {
    await expect(assertSafeUrl('http://www.facebook.com/')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertSafeUrl('https://u:p@www.facebook.com/')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertSafeUrl('https://www.facebook.com:8443/')).rejects.toBeInstanceOf(SsrfBlockedError);
  });
});
