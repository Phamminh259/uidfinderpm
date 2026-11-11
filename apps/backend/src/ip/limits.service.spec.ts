import { LimitsService } from './limits.service';

function fakePrisma(initial?: unknown) {
  let stored = initial;
  return {
    siteSetting: {
      findUnique: async () => (stored === undefined ? null : { key: 'limits', value: stored }),
      upsert: async (a: { update: { value: unknown } }) => {
        stored = a.update.value;
      },
    },
  };
}

describe('LimitsService', () => {
  it('chưa cấu hình thì dùng mặc định', async () => {
    const s = new LimitsService(fakePrisma() as never);
    const l = await s.get();
    expect(l.uidPerMinute).toBeGreaterThanOrEqual(1);
    expect(l.requestsPerDay).toBe(500);
  });
  it('lưu rồi đọc lại, bỏ qua giá trị rác trong DB', async () => {
    const p = fakePrisma({ uidPerMinute: 'abc', uidPerHour: 50 });
    const l = await new LimitsService(p as never).get();
    expect(l.uidPerHour).toBe(50);
    expect(l.uidPerMinute).toBeGreaterThanOrEqual(1);
  });
  it('cập nhật hợp lệ', async () => {
    const s = new LimitsService(fakePrisma() as never);
    const l = await s.update({ uidPerMinute: 20, failPercent: 90 });
    expect(l.uidPerMinute).toBe(20);
    expect((await s.get()).failPercent).toBe(90);
  });
  it('từ chối giá trị ngoài khoảng hoặc không phải số nguyên', async () => {
    const s = new LimitsService(fakePrisma() as never);
    await expect(s.update({ uidPerMinute: 0 })).rejects.toThrow();
    await expect(s.update({ uidPerMinute: 601 })).rejects.toThrow();
    await expect(s.update({ failPercent: 101 })).rejects.toThrow();
    await expect(s.update({ uidPerHour: 1.5 })).rejects.toThrow();
    await expect(s.update({ uidPerHour: '5' })).rejects.toThrow();
  });
});
