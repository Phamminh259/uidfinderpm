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
import { IsBoolean, IsEmail, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AnalyticsService } from '../analytics/analytics.service';
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
    private readonly analytics: AnalyticsService,
    private readonly health: HealthService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  // ----- Thống kê -----
  @Get('dashboard/traffic')
  traffic() {
    return this.analytics.traffic();
  }

  @Get('dashboard/uid')
  uid() {
    return this.analytics.uidStats();
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
