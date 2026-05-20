import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.setGlobalPrefix('api', { exclude: ['/health'] });

  // CORS para el frontend (vite dev en 5173, preview en 4173).
  const corsOrigin =
    process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean) ??
    ['http://localhost:5173'];
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Headers de seguridad básicos (RNF14).
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('La Esperanza API')
    .setDescription(
      'Sistema de Gestión y Comercialización Agrícola — backend v1.0.0 (Proyecto III, UMG).',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Catálogo')
    .addTag('Productos')
    .addTag('Solicitudes')
    .addTag('Acuerdos')
    .addTag('Catálogos maestros')
    .addTag('Usuarios')
    .addTag('Incidencias')
    .addTag('Notificaciones')
    .addTag('Reportes')
    .addTag('Auditoría')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🌱 La Esperanza API escuchando en http://localhost:${port}`);
  logger.log(`📘 Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
