import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MetricsService } from './health/metrics.service';

const REQUIRED_ENV = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ANALYTICS_IP_SALT',
  'CORS_ORIGIN',
];

function assertEnv(): void {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}`);
  }
  if (process.env.NODE_ENV === 'production') {
    const weak = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ANALYTICS_IP_SALT'].filter(
      (k) => (process.env[k] ?? '').startsWith('DOI_') || (process.env[k] ?? '').length < 32,
    );
    if (weak.length > 0) {
      throw new Error(`Giá trị bí mật chưa an toàn (cần đổi, tối thiểu 32 ký tự): ${weak.join(', ')}`);
    }
  }
}

async function bootstrap(): Promise<void> {
  assertEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN!.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const metrics = app.get(MetricsService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      if (req.originalUrl.startsWith('/api/health')) return;
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      metrics.record(res.statusCode, ms).catch(() => undefined);
    });
    next();
  });

  app.enableShutdownHooks();
  const port = Number(process.env.BACKEND_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Backend đang chạy tại cổng ${port}`);
}

void bootstrap();
