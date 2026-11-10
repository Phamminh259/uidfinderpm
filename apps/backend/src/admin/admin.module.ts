import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AdminController } from './admin.controller';
import { SettingsController } from './settings.controller';

@Module({
  imports: [AnalyticsModule],
  controllers: [AdminController, SettingsController],
})
export class AdminModule {}
