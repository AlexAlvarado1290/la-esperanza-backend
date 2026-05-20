import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import {
  InAppNotificationStrategy,
  NOTIFICATION_STRATEGIES,
  SmsNotificationStrategy,
} from './notification-channel.strategy';
import { SMS_ADAPTER } from '../../common/adapters/sms.adapter';

// PATRÓN: Strategy — el canal de notificación (in-app vs SMS) se selecciona en
// runtime mediante NotificationChannelStrategy (RF38, RNF27).
// PATRÓN: Observer — NotificationsService reacciona a eventos de dominio.

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    {
      provide: NOTIFICATION_STRATEGIES,
      useFactory: (smsAdapter: any) => [
        new InAppNotificationStrategy(),
        new SmsNotificationStrategy(smsAdapter),
      ],
      inject: [SMS_ADAPTER],
    },
  ],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
