import { Controller, Get, Header } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SETTING_KEYS } from './admin.controller';

/** Cấu hình công khai (logo, liên hệ, mạng xã hội) cho footer và trang liên hệ. */
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('public')
  @Header('Cache-Control', 'public, max-age=60')
  async publicSettings() {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
}
