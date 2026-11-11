import { classifyIp, DEFAULT_THRESHOLDS } from './ip-classify';

const calm = { requests: 10, success: 3, failed: 1, invalid: 0, rateLimited: 0 };

describe('classifyIp', () => {
  it('IP bình thường', () => {
    expect(classifyIp(calm, DEFAULT_THRESHOLDS, false)).toEqual({ status: 'normal', reasons: [] });
  });
  it('IP bị chặn luôn có trạng thái blocked', () => {
    expect(classifyIp({ ...calm, requests: 99999 }, DEFAULT_THRESHOLDS, true).status).toBe('blocked');
  });
  it('quá nhiều request', () => {
    const r = classifyIp({ ...calm, requests: 500 }, DEFAULT_THRESHOLDS, false);
    expect(r.status).toBe('suspicious');
    expect(r.reasons[0]).toMatch(/500 request/);
  });
  it('nhiều lần bị giới hạn tốc độ', () => {
    expect(classifyIp({ ...calm, rateLimited: 5 }, DEFAULT_THRESHOLDS, false).status).toBe('suspicious');
    expect(classifyIp({ ...calm, rateLimited: 4 }, DEFAULT_THRESHOLDS, false).status).toBe('normal');
  });
  it('tỉ lệ thất bại cao chỉ tính khi đủ số lượt', () => {
    expect(classifyIp({ ...calm, success: 1, failed: 9 }, DEFAULT_THRESHOLDS, false).status).toBe('normal');
    expect(classifyIp({ ...calm, success: 2, failed: 28 }, DEFAULT_THRESHOLDS, false).status).toBe('suspicious');
  });
  it('ngưỡng bằng 0 nghĩa là tắt quy tắc đó', () => {
    const off = { ...DEFAULT_THRESHOLDS, requestsPerDay: 0, rateLimitedHits: 0, invalidHits: 0, failPercent: 0 };
    expect(classifyIp({ requests: 1e6, success: 0, failed: 100, invalid: 100, rateLimited: 100 }, off, false).status).toBe('normal');
  });
});
