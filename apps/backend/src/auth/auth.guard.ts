import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type AdminRoleName = 'SUPER_ADMIN' | 'ADMIN';

export interface AuthUser {
  sub: string;
  role: AdminRoleName;
  email: string;
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AdminRoleName[]) => SetMetadata(ROLES_KEY, roles);

export type AuthedRequest = Request & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      const payload = this.jwt.verify<AuthUser>(header.slice(7), {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRoleName[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!required.includes(req.user.role)) throw new ForbiddenException();
    return true;
  }
}
