import { Global, Injectable, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: string | null,
    action: string,
    target?: string,
    meta?: Prisma.InputJsonValue,
    ipHash?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { adminId, action, target, meta, ipHash },
    });
  }
}

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
