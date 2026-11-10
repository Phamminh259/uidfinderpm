import { Global, Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [HealthController],
  providers: [HealthService, MetricsService],
  exports: [HealthService, MetricsService],
})
export class HealthModule {}
