import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Tăng bộ đếm, đặt TTL ở lần tăng đầu tiên. Trả về giá trị sau khi tăng. */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
