import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { FacebookModule } from './facebook/facebook.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { UidFinderModule } from './uid-finder/uid-finder.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuditModule,
    AuthModule,
    HealthModule,
    FacebookModule,
    UidFinderModule,
    AnalyticsModule,
    AdminModule,
  ],
})
export class AppModule {}
