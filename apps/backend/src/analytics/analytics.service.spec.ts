import { detectDevice, detectSource, startOfDayVN } from './analytics.service';

describe('analytics helpers', () => {
  it('phân loại nguồn truy cập', () => {
    expect(detectSource(undefined)).toBe('direct');
    expect(detectSource('https://www.google.com/search?q=x')).toBe('google');
    expect(detectSource('https://l.facebook.com/l.php')).toBe('facebook');
    expect(detectSource('https://www.tiktok.com/@a')).toBe('tiktok');
    expect(detectSource('https://example.org')).toBe('other');
  });

  it('phân loại thiết bị', () => {
    expect(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile')).toBe('mobile');
    expect(detectDevice('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
    expect(detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });

  it('tính đầu ngày theo giờ Việt Nam', () => {
    // 2026-11-10 03:30 UTC = 10:30 giờ VN → đầu ngày VN là 2026-11-09 17:00 UTC
    const d = startOfDayVN(0, new Date('2026-11-10T03:30:00Z'));
    expect(d.toISOString()).toBe('2026-11-09T17:00:00.000Z');
  });
});
