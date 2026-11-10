import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

function hourKey(d = new Date()): string {
  return d.toISOString().slice(0, 13).replace(/[-T]/g, '');
}

/** Ghi số liệu request theo giờ vào Redis (HINCRBY), giữ 48 giờ. */
@Injectable()
export class MetricsService {
  constructor(private readonly redis: RedisService) {}

  async record(statusCode: number, durationMs: number): Promise<void> {
    const key = `metrics:${hourKey()}`;
    const c = this.redis.client;
    const pipe = c.multi().hincrby(key, 'total', 1).hincrby(key, 'durMs', Math.round(durationMs));
    if (statusCode >= 500) pipe.hincrby(key, 'c5xx', 1);
    else if (statusCode >= 400) pipe.hincrby(key, 'c4xx', 1);
    pipe.expire(key, 48 * 3600);
    await pipe.exec();
  }

  async last24Hours() {
    const now = Date.now();
    const keys: string[] = [];
    for (let i = 0; i < 24; i++) keys.push(hourKey(new Date(now - i * 3600_000)));
    const rows = await Promise.all(keys.map((k) => this.redis.client.hgetall(`metrics:${k}`)));
    let total = 0;
    let dur = 0;
    let c4 = 0;
    let c5 = 0;
    for (const r of rows) {
      total += Number(r.total ?? 0);
      dur += Number(r.durMs ?? 0);
      c4 += Number(r.c4xx ?? 0);
      c5 += Number(r.c5xx ?? 0);
    }
    return {
      requests: total,
      avgResponseMs: total > 0 ? Math.round(dur / total) : null,
      http4xx: c4,
      http5xx: c5,
    };
  }
}
