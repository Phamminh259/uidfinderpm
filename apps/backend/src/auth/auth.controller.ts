import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Request, Response } from 'express';
import { clientIp, hashWithSalt } from '../common/hash.util';
import { PrismaService } from '../database/prisma.service';
import { AuthedRequest, JwtAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;
}

const COOKIE = 'uidf_rt';

function setRefreshCookie(res: Response, token: string, expires: Date): void {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    // Chỉ bật Secure khi site chạy HTTPS thật; trên http://localhost cookie Secure sẽ không được lưu.
    secure: (process.env.PUBLIC_SITE_URL ?? '').startsWith('https://'),
    sameSite: 'strict',
    path: '/api/auth',
    expires,
  });
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  private ipHash(req: Request): string {
    return hashWithSalt(clientIp(req), process.env.ANALYTICS_IP_SALT ?? '');
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const r = await this.auth.login(dto.email, dto.password, this.ipHash(req), req.headers['user-agent']);
    setRefreshCookie(res, r.refreshToken, r.refreshExpiresAt);
    return { accessToken: r.accessToken, user: r.user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE];
    if (!token) throw new UnauthorizedException();
    const r = await this.auth.refresh(token, this.ipHash(req), req.headers['user-agent']);
    setRefreshCookie(res, r.refreshToken, r.refreshExpiresAt);
    return { accessToken: r.accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout((req.cookies as Record<string, string> | undefined)?.[COOKIE]);
    res.clearCookie(COOKIE, { path: '/api/auth' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthedRequest) {
    const u = await this.prisma.adminUser.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!u) throw new UnauthorizedException();
    return u;
  }
}
