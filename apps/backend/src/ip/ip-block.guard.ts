import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { clientIp } from '../common/hash.util';
import { IpService } from './ip.service';

/** Các đường dẫn luôn mở để quản trị viên không bị khóa ngoài và để kiểm tra sức khỏe hệ thống. */
const EXEMPT_PREFIXES = ['/api/health', '/api/admin', '/api/auth'];

@Injectable()
export class IpBlockGuard implements CanActivate {
  constructor(private readonly ips: IpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const url = req.originalUrl ?? req.url ?? '';
    if (EXEMPT_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`) || url.startsWith(`${p}?`))) return true;
    if (await this.ips.isBlocked(clientIp(req))) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'IP_BLOCKED',
        message: 'Địa chỉ IP của bạn đã bị chặn do có dấu hiệu lạm dụng. Vui lòng liên hệ quản trị viên nếu đây là nhầm lẫn.',
      });
    }
    return true;
  }
}
