import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { clientIp, hashWithSalt } from '../common/hash.util';
import { LookupUidDto } from './uid-finder.dto';
import { UidFinderService } from './uid-finder.service';

@Controller('uid')
export class UidFinderController {
  constructor(private readonly service: UidFinderService) {}

  @Post('lookup')
  @HttpCode(200)
  lookup(@Body() dto: LookupUidDto, @Req() req: Request) {
    const ip = clientIp(req);
    const ipHash = hashWithSalt(ip, process.env.ANALYTICS_IP_SALT ?? '');
    return this.service.lookup(dto.url, ipHash, ip);
  }
}
