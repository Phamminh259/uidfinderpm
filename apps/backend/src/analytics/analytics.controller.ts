import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import { clientIp, hashWithSalt } from '../common/hash.util';
import { RedisService } from '../redis/redis.service';
import { AnalyticsService } from './analytics.service';

class CollectDto {
  @IsString()
  @MaxLength(300)
  path!: string;

  @IsString()
  @MaxLength(64)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly redis: RedisService,
  ) {}

  @Post('collect')
  @HttpCode(204)
  async collect(@Body() dto: CollectDto, @Req() req: Request): Promise<void> {
    const salt = process.env.ANALYTICS_IP_SALT ?? '';
    const ua = req.headers['user-agent'] ?? '';
    const visitorHash = hashWithSalt(`${clientIp(req)}|${ua}`, salt);

    // Chống spam: tối đa 120 lượt ghi/phút cho mỗi người truy cập.
    const n = await this.redis
      .incrWithTtl(`rl:collect:${visitorHash}:${Math.floor(Date.now() / 60000)}`, 70)
      .catch(() => 0);
    if (n > 120) return;

    // Chỉ ghi đường dẫn nội bộ của site.
    if (!dto.path.startsWith('/') || dto.path.startsWith('/admin')) return;

    await this.analytics.collect({
      path: dto.path,
      referrer: dto.referrer,
      sessionId: dto.sessionId,
      visitorHash,
      userAgent: ua,
    });
  }
}
