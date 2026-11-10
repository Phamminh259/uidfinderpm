import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UID_ERROR_CODES, UidResult, UidTargetType } from '../common/types';
import {
  FacebookBlockedError,
  FacebookService,
  FacebookUpstreamError,
} from '../facebook/facebook.service';
import { SsrfBlockedError } from '../facebook/ssrf.guard';
import {
  InvalidFacebookUrlError,
  parseFacebookUrl,
  ParsedFacebookUrl,
} from '../facebook/url-parser';

type LookupStatus = 'SUCCESS' | 'FAILED' | 'RATE_LIMITED' | 'INVALID';

@Injectable()
export class UidFinderService {
  private readonly logger = new Logger(UidFinderService.name);
  private readonly limitPerMinute = Number(process.env.UID_RATE_LIMIT_PER_MINUTE ?? 10);
  private readonly cacheTtl = Number(process.env.UID_CACHE_TTL_SECONDS ?? 86400);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly facebook: FacebookService,
  ) {}

  async lookup(input: string, ipHash: string): Promise<UidResult> {
    const started = Date.now();

    // 1. Rate limit theo IP đã băm (cửa sổ 60 giây)
    const bucket = Math.floor(Date.now() / 60000);
    const count = await this.redis
      .incrWithTtl(`rl:uid:${ipHash}:${bucket}`, 70)
      .catch(() => 0);
    if (count > this.limitPerMinute) {
      await this.log({ input, status: 'RATE_LIMITED', ipHash, started, errorCode: UID_ERROR_CODES.RATE_LIMITED });
      throw this.error(HttpStatus.TOO_MANY_REQUESTS, UID_ERROR_CODES.RATE_LIMITED, 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút');
    }

    // 2. Phân tích URL
    let parsed: ParsedFacebookUrl;
    try {
      parsed = parseFacebookUrl(input);
    } catch (err) {
      const msg = err instanceof InvalidFacebookUrlError ? err.message : 'Đường dẫn không hợp lệ';
      await this.log({ input, status: 'INVALID', ipHash, started, errorCode: UID_ERROR_CODES.INVALID_URL });
      throw this.error(HttpStatus.BAD_REQUEST, UID_ERROR_CODES.INVALID_URL, msg);
    }

    // 3. Cache
    const cacheKey = `uid:${parsed.normalizedUrl}`;
    const cachedRaw = await this.redis.get(cacheKey).catch(() => null);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as UidResult;
      await this.log({ input, status: 'SUCCESS', ipHash, started, result: cached, cached: true });
      return { ...cached, cached: true };
    }

    // 4. Xác định UID
    try {
      const result = await this.resolve(parsed);
      await this.redis.set(cacheKey, JSON.stringify(result), this.cacheTtl).catch(() => undefined);
      await this.log({ input, status: 'SUCCESS', ipHash, started, result });
      return result;
    } catch (err) {
      return this.handleFailure(err, input, ipHash, started);
    }
  }

  private async resolve(parsed: ParsedFacebookUrl): Promise<UidResult> {
    let current = parsed;

    if (current.needsRedirect) {
      const finalUrl = await this.facebook.resolveRedirect(current.normalizedUrl);
      try {
        current = parseFacebookUrl(finalUrl);
      } catch {
        // URL sau redirect không nhận diện được: tải trang để tìm UID.
        current = { ...current, normalizedUrl: finalUrl, needsRedirect: false };
      }
    }

    if (current.uid) return this.build(current, current.uid);

    const uid = await this.facebook.extractUidFromPage(current.normalizedUrl);
    if (!uid) {
      throw this.error(
        HttpStatus.NOT_FOUND,
        UID_ERROR_CODES.NOT_FOUND,
        'Không tìm thấy UID. Đối tượng có thể không công khai hoặc không tồn tại',
      );
    }
    return this.build(current, uid);
  }

  private build(p: ParsedFacebookUrl, uid: string): UidResult {
    return {
      uid,
      url: p.normalizedUrl,
      username: p.type === 'POST' ? null : p.username,
      type: p.type,
      cached: false,
    };
  }

  private async handleFailure(
    err: unknown,
    input: string,
    ipHash: string,
    started: number,
  ): Promise<never> {
    if (err instanceof HttpException) {
      const body = err.getResponse() as { code?: string };
      await this.log({ input, status: 'FAILED', ipHash, started, errorCode: body.code });
      throw err;
    }
    if (err instanceof FacebookBlockedError) {
      await this.log({ input, status: 'FAILED', ipHash, started, errorCode: UID_ERROR_CODES.FB_BLOCKED });
      throw this.error(HttpStatus.SERVICE_UNAVAILABLE, UID_ERROR_CODES.FB_BLOCKED, err.message);
    }
    if (err instanceof SsrfBlockedError) {
      await this.log({ input, status: 'FAILED', ipHash, started, errorCode: UID_ERROR_CODES.HOST_NOT_ALLOWED });
      throw this.error(HttpStatus.BAD_REQUEST, UID_ERROR_CODES.HOST_NOT_ALLOWED, err.message);
    }
    if (err instanceof FacebookUpstreamError) {
      await this.log({ input, status: 'FAILED', ipHash, started, errorCode: UID_ERROR_CODES.UPSTREAM_ERROR });
      throw this.error(HttpStatus.BAD_GATEWAY, UID_ERROR_CODES.UPSTREAM_ERROR, err.message);
    }
    this.logger.error('Lỗi không xác định khi tra cứu UID', err as Error);
    await this.log({ input, status: 'FAILED', ipHash, started, errorCode: UID_ERROR_CODES.UPSTREAM_ERROR });
    throw this.error(HttpStatus.INTERNAL_SERVER_ERROR, UID_ERROR_CODES.UPSTREAM_ERROR, 'Đã xảy ra lỗi, vui lòng thử lại');
  }

  private error(status: number, code: string, message: string): HttpException {
    return new HttpException({ statusCode: status, code, message }, status);
  }

  private async log(args: {
    input: string;
    status: LookupStatus;
    ipHash: string;
    started: number;
    errorCode?: string;
    result?: UidResult;
    cached?: boolean;
  }): Promise<void> {
    try {
      await this.prisma.uidLookup.create({
        data: {
          inputUrl: args.input.slice(0, 2048),
          uid: args.result?.uid ?? null,
          username: args.result?.username ?? null,
          targetType: (args.result?.type ?? 'UNKNOWN') as UidTargetType,
          status: args.status,
          errorCode: args.errorCode ?? null,
          cached: args.cached ?? false,
          ipHash: args.ipHash,
          durationMs: Date.now() - args.started,
        },
      });
    } catch (e) {
      this.logger.warn(`Không ghi được UidLookup: ${(e as Error).message}`);
    }
  }
}
