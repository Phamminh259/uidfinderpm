import { Injectable } from '@nestjs/common';
import { statfs } from 'fs/promises';
import * as os from 'os';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MetricsService } from './metrics.service';

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const c of os.cpus()) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

async function cpuUsagePercent(): Promise<number> {
  const a = cpuTimes();
  await new Promise((r) => setTimeout(r, 250));
  const b = cpuTimes();
  const totalDiff = b.total - a.total;
  const idleDiff = b.idle - a.idle;
  if (totalDiff <= 0) return 0;
  return Math.round((1 - idleDiff / totalDiff) * 1000) / 10;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  async liveness() {
    const [db, redis] = await Promise.all([this.pingDb(), this.pingRedis()]);
    return { status: db.ok && redis.ok ? 'ok' : 'degraded', database: db.ok, redis: redis.ok };
  }

  async system() {
    const [db, redis, cpu, disk, requests] = await Promise.all([
      this.pingDb(),
      this.pingRedis(),
      cpuUsagePercent(),
      this.disk(),
      this.metrics.last24Hours(),
    ]);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      cpuPercent: cpu,
      memory: {
        totalBytes: totalMem,
        usedBytes: totalMem - freeMem,
        usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10,
      },
      disk,
      api: { ok: true, uptimeSeconds: Math.round(process.uptime()) },
      postgres: db,
      redis,
      requests24h: requests,
    };
  }

  private async pingDb(): Promise<{ ok: boolean; latencyMs: number | null }> {
    const t = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - t };
    } catch {
      return { ok: false, latencyMs: null };
    }
  }

  private async pingRedis(): Promise<{ ok: boolean; latencyMs: number | null }> {
    const t = Date.now();
    const ok = await this.redis.ping();
    return { ok, latencyMs: ok ? Date.now() - t : null };
  }

  private async disk() {
    try {
      const s = await statfs('/');
      const total = s.blocks * s.bsize;
      const free = s.bavail * s.bsize;
      return {
        totalBytes: total,
        usedBytes: total - free,
        usedPercent: total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0,
      };
    } catch {
      return { totalBytes: 0, usedBytes: 0, usedPercent: 0 };
    }
  }
}
