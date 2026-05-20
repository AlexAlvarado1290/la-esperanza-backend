import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { ProductsModule } from './modules/products/products.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RequestsModule } from './modules/requests/requests.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.body.pin', 'req.body.newPin', 'req.body.currentPin'],
      },
    }),
    EventEmitterModule.forRoot({ wildcard: true, maxListeners: 50 }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    MasterDataModule,
    ProductsModule,
    CatalogModule,
    RequestsModule,
    AgreementsModule,
    IncidentsModule,
    NotificationsModule,
    AuditModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
