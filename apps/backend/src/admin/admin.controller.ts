import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { IsBoolean, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DashboardService } from '../analytics/dashboard.service';
import { RangeKey } from '../analytics/ranges';
import { clientIp } from '../common/hash.util';
import { IpService } from '../ip/ip.service';
import { Limits, LimitsService } from '../ip/limits.service';
import { AuditService } from '../audit/audit.service';
import { AuthedRequest, JwtAuthGuard, Roles, RolesGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';
import { HealthService } from '../health/health.service';

class CreateAdminDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsIn(['SUPER_ADMIN', 'ADMIN'])
  role!: 'SUPER_ADMIN' | 'ADMIN';
}

class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsIn(['SUPER_ADMIN', 'ADMIN'])
  role?: 'SUPER_ADMIN' | 'ADMIN';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  password?: string;
}

class BlockIpDto {
  @IsString()
  @MaxLength(64)
  ip!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

class UnblockIpDto {
  @IsString()
  @MaxLength(64)
  ip!: string;
}

class IpLimitDto {
  @IsString()
  @MaxLength(64)
  ip!: string;

  /** null = quay về giới hạn chung. 0 = không cho tra cứu. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  limitPerMinute?: number | null;
}

class LimitsDto {
  @IsOptional() @IsInt() uidPerMinute?: number;
  @IsOptional() @IsInt() uidPerHour?: number;
  @IsOptional() @IsInt() requestsPerDay?: number;
  @IsOptional() @IsInt() rateLimitedHits?: number;
  @IsOptional() @IsInt() invalidHits?: number;
  @IsOptional() @IsInt() failPercent?: number;
  @IsOptional() @IsInt() failMinAttempts?: number;
}

class SettingsDto {
  @IsObject()
  settings!: Record<string, unknown>;
}

/** Các khóa cấu hình được phép chỉnh sửa. */
export const SETTING_KEYS = [
  'siteName',
  'siteTagline',
  'logoUrl',
  'contactEmail',
  'contactPhone',
  'contactAddress',
  'socialFacebook',
  'socialTiktok',
  'socialYoutube',
  'socialZalo',
  'socialTelegram',
] as const;

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly ips: IpService,
    private readonly limits: LimitsService,
    private readonly health: HealthService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  // ----- Thống kê -----
  /** Số liệu theo hôm nay, 2 giờ qua, 7 ngày, 30 ngày; thêm `from`/`to` (YYYY-MM-DD, giờ Việt Nam) cho khoảng tùy chọn. */
  @Get('dashboard/summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    if ((from && !to) || (!from && to)) throw new BadRequestException('Cần chọn cả ngày bắt đầu và ngày kết thúc');
    return this.dashboard.summary(from && to ? { from, to } : undefined);
  }

  @Get('dashboard/series')
  series() {
    return this.dashboard.series30();
  }

  // ----- Địa chỉ IP -----
  @Get('ips')
  ipList(
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('filter') filter?: string,
    @Query('page') page?: string,
  ) {
    const allowedRanges: RangeKey[] = ['2h', '24h', 'today', '7d', '30d', 'custom'];
    const r = (range ?? '24h') as RangeKey;
    if (!allowedRanges.includes(r)) throw new BadRequestException('Khoảng thời gian không hợp lệ');
    const f = filter === 'suspicious' || filter === 'blocked' ? filter : 'all';
    return this.dashboard.ipList({ range: r, from, to, q, filter: f, page: Number(page) || 1 });
  }

  @Post('ips/block')
  @HttpCode(200)
  async blockIp(@Body() dto: BlockIpDto, @Req() req: AuthedRequest) {
    const ip = this.ips.parseIp(dto.ip);
    if (ip === clientIp(req)) throw new ForbiddenException('Không thể chặn chính địa chỉ IP bạn đang dùng');
    await this.ips.block(ip, dto.reason);
    await this.audit.log(req.user.sub, 'IP_BLOCK', ip, { reason: dto.reason });
    return { ip, blocked: true };
  }

  @Post('ips/unblock')
  @HttpCode(200)
  async unblockIp(@Body() dto: UnblockIpDto, @Req() req: AuthedRequest) {
    const ip = this.ips.parseIp(dto.ip);
    await this.ips.unblock(ip);
    await this.audit.log(req.user.sub, 'IP_UNBLOCK', ip);
    return { ip, blocked: false };
  }

  @Put('ips/limit')
  async setIpLimit(@Body() dto: IpLimitDto, @Req() req: AuthedRequest) {
    const ip = this.ips.parseIp(dto.ip);
    const limit = dto.limitPerMinute ?? null;
    await this.ips.setLimit(ip, limit);
    await this.audit.log(req.user.sub, 'IP_LIMIT_SET', ip, { limitPerMinute: limit });
    return { ip, limitPerMinute: limit };
  }

  // ----- Giới hạn request chung -----
  @Get('limits')
  getLimits(): Promise<Limits> {
    return this.limits.get();
  }

  @Put('limits')
  async putLimits(@Body() dto: LimitsDto, @Req() req: AuthedRequest): Promise<Limits> {
    const updated = await this.limits.update({ ...dto });
    await this.audit.log(req.user.sub, 'LIMITS_UPDATE', undefined, { ...dto });
    return updated;
  }

  @Get('dashboard/system')
  system() {
    return this.health.system();
  }

  // ----- Nhật ký hoạt động -----
  @Get('audit-logs')
  async auditLogs(@Query('page') pageRaw?: string) {
    const page = Math.max(1, Number(pageRaw) || 1);
    const take = 50;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
        include: { admin: { select: { email: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return {
      page,
      total,
      items: items.map((l) => ({
        id: l.id,
        action: l.action,
        target: l.target,
        admin: l.admin?.email ?? null,
        createdAt: l.createdAt,
      })),
    };
  }

  // ----- Cấu hình website -----
  @Get('settings')
  async getSettings() {
    const rows = await this.prisma.siteSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  @Put('settings')
  async putSettings(@Body() dto: SettingsDto, @Req() req: AuthedRequest) {
    const allowed = new Set<string>(SETTING_KEYS);
    const entries = Object.entries(dto.settings).filter(([k]) => allowed.has(k));
    if (entries.length === 0) throw new BadRequestException('Không có khóa cấu hình hợp lệ');
    for (const [key, value] of entries) {
      if (typeof value !== 'string' || value.length > 500) {
        throw new BadRequestException(`Giá trị của ${key} không hợp lệ`);
      }
      await this.prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
    await this.audit.log(req.user.sub, 'SETTINGS_UPDATE', undefined, { keys: entries.map(([k]) => k) });
    return { updated: entries.map(([k]) => k) };
  }

  // ----- Quản lý quản trị viên (chỉ SUPER_ADMIN) -----
  @Get('admins')
  @Roles('SUPER_ADMIN')
  listAdmins() {
    return this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  @Post('admins')
  @Roles('SUPER_ADMIN')
  async createAdmin(@Body() dto: CreateAdminDto, @Req() req: AuthedRequest) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.adminUser.findUnique({ where: { email } })) {
      throw new ConflictException('Email đã tồn tại');
    }
    const created = await this.prisma.adminUser.create({
      data: {
        email,
        name: dto.name,
        role: dto.role,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    await this.audit.log(req.user.sub, 'ADMIN_CREATE', created.email, { role: created.role });
    return created;
  }

  @Patch('admins/:id')
  @Roles('SUPER_ADMIN')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto, @Req() req: AuthedRequest) {
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException();
    if (id === req.user.sub && (dto.role === 'ADMIN' || dto.isActive === false)) {
      throw new ForbiddenException('Không thể tự hạ quyền hoặc vô hiệu hóa chính mình');
    }
    const data: Prisma.AdminUserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (dto.password || dto.isActive === false || dto.role) await this.auth.revokeAllForAdmin(id);
    await this.audit.log(req.user.sub, 'ADMIN_UPDATE', target.email, {
      role: dto.role,
      isActive: dto.isActive,
      passwordChanged: Boolean(dto.password),
    });
    return updated;
  }

  @Delete('admins/:id')
  @Roles('SUPER_ADMIN')
  @HttpCode(204)
  async deleteAdmin(@Param('id') id: string, @Req() req: AuthedRequest): Promise<void> {
    if (id === req.user.sub) throw new ForbiddenException('Không thể xóa chính mình');
    const target = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!target) throw new NotFoundException();
    await this.prisma.adminUser.delete({ where: { id } });
    await this.audit.log(req.user.sub, 'ADMIN_DELETE', target.email);
  }
}
