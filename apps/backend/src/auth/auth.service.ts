import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthUser } from './auth.guard';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  private readonly maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
  private readonly lockMinutes = Number(process.env.LOGIN_LOCK_MINUTES ?? 15);
  private readonly refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    ipHash: string,
    userAgent?: string,
  ): Promise<IssuedTokens & { user: { id: string; email: string; role: string; name: string | null } }> {
    const normalized = email.trim().toLowerCase();
    const lockKey = `login:fail:${normalized}:${ipHash}`;

    const fails = Number((await this.redis.get(lockKey)) ?? 0);
    if (fails >= this.maxAttempts) {
      throw new HttpException(
        { statusCode: 429, code: 'LOGIN_LOCKED', message: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { email: normalized } });
    const ok = admin?.isActive ? await argon2.verify(admin.passwordHash, password).catch(() => false) : false;

    if (!admin || !ok) {
      await this.redis.incrWithTtl(lockKey, this.lockMinutes * 60);
      await this.audit.log(admin?.id ?? null, 'LOGIN_FAILED', normalized, undefined, ipHash).catch(() => undefined);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    await this.redis.del(lockKey);
    const tokens = await this.issue(admin.id, admin.email, admin.role, ipHash, userAgent);
    await this.audit.log(admin.id, 'LOGIN', admin.email, undefined, ipHash);
    return { ...tokens, user: { id: admin.id, email: admin.email, role: admin.role, name: admin.name } };
  }

  async refresh(refreshToken: string, ipHash: string, userAgent?: string): Promise<IssuedTokens> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
      include: { admin: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.admin.isActive) {
      throw new UnauthorizedException();
    }
    // Xoay vòng refresh token: thu hồi phiên cũ, cấp phiên mới.
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.issue(session.admin.id, session.admin.email, session.admin.role, ipHash, userAgent);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.session
      .updateMany({
        where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }

  async revokeAllForAdmin(adminId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(
    adminId: string,
    email: string,
    role: string,
    ipHash: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const payload: AuthUser = { sub: adminId, email, role: role as AuthUser['role'] };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.ACCESS_TOKEN_TTL ?? '15m',
    });
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + this.refreshDays * 86400_000);
    await this.prisma.session.create({
      data: {
        adminId,
        refreshTokenHash: sha256(refreshToken),
        userAgent: userAgent?.slice(0, 255),
        ipHash,
        expiresAt: refreshExpiresAt,
      },
    });
    return { accessToken, refreshToken, refreshExpiresAt };
  }
}
