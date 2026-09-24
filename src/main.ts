import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { RequestLoggingInterceptor } from './shared/interceptors/request-logging.interceptor';

/**
 * Permissions-Policy header. Helmet 8.x does not ship a built-in
 * `permissionsPolicy` option, so we set it explicitly. The list mirrors
 * Mozilla's baseline recommendation — disable powerful features the
 * Horizon app does not need and pin the remaining ones to first-party.
 */
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'browsing-topics=()',
  'camera=()',
  'cross-origin-isolated=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=(self)',
  'gyroscope=()',
  'keyboard-map=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=(self)',
  'screen-wake-lock=()',
  'sync-xhr=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

function permissionsPolicyMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  next();
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(compression());

  app.use(permissionsPolicyMiddleware);

  app.use(
    helmet({
      // Prevent clickjacking — deny framing entirely
      frameguard: { action: 'deny' },
      // Disable MIME-type sniffing
      noSniff: true,
      // Force browser to only connect over HTTPS (1 year, include subdomains)
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // Prevent reflected XSS — let browser filter block scripts
      xssFilter: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
    }),
  );

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Horizon Truth API')
    .setDescription('Full API documentation for Horizon Truth platform')
    .setVersion('2.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
