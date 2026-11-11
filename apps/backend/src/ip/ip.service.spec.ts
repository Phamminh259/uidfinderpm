import { IpService } from './ip.service';

function make() {
  const rows = new Map<string, { ip: string; blocked: boolean; limitPerMinute: number | null; lastSeenAt?: Date }>();
  const prisma = {
    ipRecord: {
      upsert: async (a: { where: { ipHash: string }; create: { ip: string; blocked?: boolean; limitPerMinute?: number | null }; update: object }) => {
        const cur = rows.get(a.where.ipHash);
        rows.set(a.where.ipHash, cur ? { ...cur, ...a.update } as never : { blocked: false, limitPerMinute: null, ...a.create });
      },
      findUnique: async (a: { where: { ipHash: string } }) => rows.get(a.where.ipHash) ?? null,
      update: async (a: { where: { ipHash: string }; data: object }) => {
        rows.set(a.where.ipHash, { ...rows.get(a.where.ipHash)!, ...a.data } as never);
      },
      findMany: async () => [...rows.values()],
      deleteMany: async () => ({ count: 0 }),
    },
  };
  const sets = new Map<string, Set<string>>();
  const hashes = new Map<string, Map<string, string>>();
  const redis = {
    client: {
      sismember: async (k: string, m: string) => (sets.get(k)?.has(m) ? 1 : 0),
      sadd: async (k: string, m: string) => { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(m); },
      srem: async (k: string, m: string) => { sets.get(k)?.delete(m); },
      hget: async (k: string, f: string) => hashes.get(k)?.get(f) ?? null,
      hset: async (k: string, f: string, v: string) => { (hashes.get(k) ?? hashes.set(k, new Map()).get(k)!).set(f, v); },
      hdel: async (k: string, f: string) => { hashes.get(k)?.delete(f); },
    },
  };
  return { svc: new IpService(prisma as never, redis as never), rows, sets, hashes };
}

describe('IpService', () => {
  beforeAll(() => {
    process.env.ANALYTICS_IP_SALT = 'x'.repeat(32);
  });

  it('chỉ nhận địa chỉ IP hợp lệ', () => {
    const { svc } = make();
    expect(svc.parseIp('1.2.3.4')).toBe('1.2.3.4');
    expect(svc.parseIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
    expect(() => svc.parseIp('abc')).toThrow();
    expect(() => svc.parseIp('1.2.3.4; DROP TABLE')).toThrow();
    expect(() => svc.parseIp(123)).toThrow();
  });

  it('chặn rồi bỏ chặn', async () => {
    const { svc } = make();
    expect(await svc.isBlocked('1.2.3.4')).toBe(false);
    await svc.block('1.2.3.4', 'spam');
    expect(await svc.isBlocked('1.2.3.4')).toBe(true);
    expect(await svc.isBlocked('::ffff:1.2.3.4')).toBe(true);
    expect(await svc.unblock('1.2.3.4')).toBe(true);
    expect(await svc.isBlocked('1.2.3.4')).toBe(false);
  });

  it('giới hạn riêng: đặt, đọc, xóa', async () => {
    const { svc } = make();
    expect(await svc.customLimit('1.2.3.4')).toBeNull();
    await svc.setLimit('1.2.3.4', 3);
    expect(await svc.customLimit('1.2.3.4')).toBe(3);
    await svc.setLimit('1.2.3.4', 0);
    expect(await svc.customLimit('1.2.3.4')).toBe(0);
    await svc.setLimit('1.2.3.4', null);
    expect(await svc.customLimit('1.2.3.4')).toBeNull();
  });

  it('touch ghi IP một lần mỗi phút và bỏ qua IP không hợp lệ', async () => {
    const { svc, rows } = make();
    await svc.touch('not-an-ip');
    expect(rows.size).toBe(0);
    await svc.touch('8.8.8.8');
    await svc.touch('8.8.8.8');
    expect(rows.size).toBe(1);
  });

  it('resync dựng lại Redis từ DB', async () => {
    const { svc, rows, sets, hashes } = make();
    rows.set('h1', { ip: '1.1.1.1', blocked: true, limitPerMinute: null });
    rows.set('h2', { ip: '2.2.2.2', blocked: false, limitPerMinute: 5 });
    const pipe = { del: () => pipe, sadd: (k: string, m: string) => { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(m); return pipe; }, hset: (k: string, f: string, v: string) => { (hashes.get(k) ?? hashes.set(k, new Map()).get(k)!).set(f, v); return pipe; }, exec: async () => [] };
    (svc as unknown as { redis: { client: { multi: () => typeof pipe } } }).redis.client.multi = () => pipe;
    await svc.resync();
    expect(await svc.isBlocked('1.1.1.1')).toBe(true);
    expect(await svc.customLimit('2.2.2.2')).toBe(5);
  });
});
