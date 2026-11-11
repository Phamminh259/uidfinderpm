import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IpService } from '../ip/ip.service';
import { LimitsService } from '../ip/limits.service';
import { RedisService } from '../redis/redis.service';
import { UID_ERROR_CODES, UidResult, toDbTargetType } from '../common/types';
import {
  FacebookBlockedError,
  FacebookService,
  FacebookUpstreamError,
  FetchAttempt,
} from '../facebook/facebook.service';
import { SsrfBlockedError } from '../facebook/ssrf.guard';
import {
  InvalidFacebookUrlError,
  parseFacebookUrl,
  ParsedFacebookUrl,
} from '../facebook/url-parser';

type LookupStatus = 'SUCCESS' | 'FAILED' | 'RATE_LIMITED' | 'INVALID';

// Đổi tiền tố khi thay đổi cách tính kết quả để bỏ qua cache cũ.
const CACHE_PREFIX = 'uid:v2:';

@Injectable()
export class UidFinderService {
  private readonly logger = new Logger(UidFinderService.name);
  private readonly cacheTtl = Number(process.env.UID_CACHE_TTL_SECONDS ?? 86400);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly facebook: FacebookService,
    private readonly ips: IpService,
    private readonly limits: LimitsService,
  ) {}

  async lookup(input: string, ipHash: string, ip?: string): Promise<UidResult> {
    const started = Date.now();
    if (ip) void this.ips.touch(ip);

    // 1. Rate limit theo IP đã băm: theo phút (có thể đặt riêng cho từng IP) và theo giờ.
    const limits = await this.limits.get();
    const custom = ip ? await this.ips.customLimit(ip) : null;
    const perMinute = custom ?? limits.uidPerMinute;
    const bucket = Math.floor(Date.now() / 60000);
    const count = await this.redis
      .incrWithTtl(`rl:uid:${ipHash}:${bucket}`, 70)
      .catch(() => 0);
    let overHour = false;
    if (limits.uidPerHour > 0 && custom === null) {
      const hourCount = await this.redis
        .incrWithTtl(`rl:uidh:${ipHash}:${Math.floor(Date.now() / 3600000)}`, 3700)
        .catch(() => 0);
      overHour = hourCount > limits.uidPerHour;
    }
    if (count > perMinute || overHour) {
      await this.log({ input, status: 'RATE_LIMITED', ipHash, started, errorCode: UID_ERROR_CODES.RATE_LIMITED });
      throw this.error(HttpStatus.TOO_MANY_REQUESTS, UID_ERROR_CODES.RATE_LIMITED, 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút');
    }

    // 2. Phân tích link
    let parsed: ParsedFacebookUrl;
    try {
      parsed = parseFacebookUrl(input);
    } catch (err) {
      const msg = err instanceof InvalidFacebookUrlError ? err.message : 'Đường dẫn không hợp lệ';
      await this.log({ input, status: 'INVALID', ipHash, started, errorCode: UID_ERROR_CODES.INVALID_URL });
      throw this.error(HttpStatus.BAD_REQUEST, UID_ERROR_CODES.INVALID_URL, msg);
    }

    // 3. Cache
    const cacheKey = `${CACHE_PREFIX}${parsed.normalizedUrl}`;
    const cachedRaw = await this.redis.get(cacheKey).catch(() => null);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as UidResult;
      await this.log({ input, status: 'SUCCESS', ipHash, started, result: cached, cached: true });
      return { ...cached, cached: true };
    }

    // 4. Xác định ID
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
        // Link sau chuyển hướng không nhận diện được: tải trang để tìm ID.
        current = { ...current, normalizedUrl: finalUrl, needsRedirect: false };
      }
    }

    if (current.uid) return this.build(current, current.uid);

    const { uid, attempts } = await this.facebook.findId(current.normalizedUrl, current.type);
    if (!uid) {
      // Ghi chẩn đoán (không ghi link, không ghi nội dung trang) để xem bằng `docker compose logs backend`.
      this.logger.warn(
        `Không tìm thấy ID, loại=${current.type}, các lần thử=${JSON.stringify(this.summarize(attempts))}`,
      );
      const loginWall = attempts.some((a) => a.note === 'login-wall');
      throw this.error(
        HttpStatus.NOT_FOUND,
        UID_ERROR_CODES.NOT_FOUND,
        this.notFoundMessage(current, loginWall),
      );
    }
    return this.build(current, uid);
  }

  private summarize(attempts: FetchAttempt[]) {
    return attempts.map((a) => ({
      host: a.finalUrl?.split('/')[0] ?? null,
      status: a.status,
      note: a.note,
      bytes: a.bytes,
    }));
  }

  private notFoundMessage(p: ParsedFacebookUrl, loginWall: boolean): string {
    if (loginWall) {
      return 'Facebook yêu cầu đăng nhập để xem nội dung này nên không thể đọc ID. Đối tượng có thể ở chế độ riêng tư, hoặc Facebook đang chặn truy cập từ máy chủ.';
    }
    switch (p.type) {
      case 'POST':
      case 'PHOTO':
      case 'VIDEO':
      case 'REEL':
      case 'SHARE':
        return 'Không đọc được ID từ link này. Link bài viết dạng "pfbid" không chứa dãy số ID và Facebook không cho máy chủ đọc trang bài viết. Hãy thử link có dạng .../posts/<dãy số>, permalink.php?story_fbid=<dãy số>, hoặc link ảnh, video, reel có chứa dãy số.';
      case 'GROUP':
        return 'Không đọc được ID của nhóm này. Nhóm có thể ở chế độ riêng tư hoặc Facebook không công khai ID. Hãy thử link nhóm dạng facebook.com/groups/<dãy số>.';
      default:
        return 'Không tìm thấy UID. Đối tượng có thể không công khai hoặc không tồn tại';
    }
  }

  private build(p: ParsedFacebookUrl, uid: string): UidResult {
    return {
      uid,
      url: p.normalizedUrl,
      username: p.username,
      type: p.type,
      related: p.related,
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
          targetType: toDbTargetType(args.result?.type ?? 'UNKNOWN'),
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
