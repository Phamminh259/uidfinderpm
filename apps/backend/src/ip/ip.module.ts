import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IpBlockGuard } from './ip-block.guard';
import { IpService } from './ip.service';
import { LimitsService } from './limits.service';

@Global()
@Module({
  providers: [IpService, LimitsService, { provide: APP_GUARD, useClass: IpBlockGuard }],
  exports: [IpService, LimitsService],
})
export class IpModule {}
