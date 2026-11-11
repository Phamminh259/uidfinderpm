import { lastDays, vnDateString, vnDayStart, windowFor } from './ranges';

const now = new Date('2026-11-11T07:00:00Z'); // 14:00 ngày 11/11 giờ Việt Nam

describe('windowFor', () => {
  it('hôm nay bắt đầu từ 00:00 giờ Việt Nam', () => {
    expect(windowFor('today', now).from.toISOString()).toBe('2026-11-10T17:00:00.000Z');
  });
  it('2 giờ qua', () => {
    expect(windowFor('2h', now).from.toISOString()).toBe('2026-11-11T05:00:00.000Z');
  });
  it('7 ngày và 30 ngày tính cả hôm nay', () => {
    expect(windowFor('7d', now).from.toISOString()).toBe('2026-11-04T17:00:00.000Z');
    expect(windowFor('30d', now).from.toISOString()).toBe('2026-10-12T17:00:00.000Z');
  });
  it('tùy chọn: gồm cả ngày kết thúc', () => {
    const w = windowFor('custom', now, '2026-11-09', '2026-11-10');
    expect(w.from.toISOString()).toBe('2026-11-08T17:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-11-10T17:00:00.000Z');
  });
  it('tùy chọn: từ chối ngày sai, đảo ngược, hoặc quá 366 ngày', () => {
    expect(() => windowFor('custom', now, '2026-11-10', '2026-11-09')).toThrow();
    expect(() => windowFor('custom', now, '2026-02-30', '2026-03-01')).toThrow();
    expect(() => windowFor('custom', now, 'abc', '2026-03-01')).toThrow();
    expect(() => windowFor('custom', now, '2024-01-01', '2026-11-09')).toThrow();
    expect(() => windowFor('custom', now)).toThrow();
  });
});

describe('ngày giờ Việt Nam', () => {
  it('vnDateString và vnDayStart đối xứng', () => {
    expect(vnDateString(new Date('2026-11-10T17:00:00Z'))).toBe('2026-11-11');
    expect(vnDayStart('2026-11-11').toISOString()).toBe('2026-11-10T17:00:00.000Z');
  });
  it('lastDays trả đủ số ngày, cũ nhất trước', () => {
    const d = lastDays(30, now);
    expect(d).toHaveLength(30);
    expect(d[0]).toBe('2026-10-13');
    expect(d[29]).toBe('2026-11-11');
  });
});
