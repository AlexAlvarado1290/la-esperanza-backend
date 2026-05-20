// PATRÓN: Strategy — cada canal de notificación implementa la misma interfaz
// y el servicio elige cuál usar según el tipo y la urgencia del evento (RF38).

import { TipoNotificacion } from '@prisma/client';
import { SmsAdapter } from '../../common/adapters/sms.adapter';

export const NOTIFICATION_STRATEGIES = Symbol('NotificationStrategies');

export interface NotificationChannelStrategy {
  readonly channel: 'in-app' | 'sms';
  supports(tipo: TipoNotificacion): boolean;
  send(target: NotificationTarget, message: NotificationMessage): Promise<void>;
}

export interface NotificationTarget {
  idUsuario: number;
  telefono: string;
}

export interface NotificationMessage {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  payload?: Record<string, unknown>;
}

export class InAppNotificationStrategy implements NotificationChannelStrategy {
  readonly channel = 'in-app';
  // La persistencia real la maneja NotificationsService; esta estrategia sólo
  // marca el canal como aplicable.
  supports(_tipo: TipoNotificacion): boolean {
    return true;
  }
  async send(_t: NotificationTarget, _m: NotificationMessage): Promise<void> {
    // El servicio orquestador persiste; la estrategia no toca BD directamente.
  }
}

export class SmsNotificationStrategy implements NotificationChannelStrategy {
  readonly channel = 'sms';
  // RF38 — SMS sólo para eventos críticos (aceptación, cancelación, entrega).
  private readonly tiposSms = new Set<TipoNotificacion>([
    TipoNotificacion.ACUERDO_ACEPTADO,
    TipoNotificacion.ACUERDO_CANCELADO,
    TipoNotificacion.ENTREGA_CONFIRMADA,
    TipoNotificacion.ALTA_USUARIO,
    TipoNotificacion.PIN_REINICIADO,
  ]);

  constructor(private readonly sms: SmsAdapter) {}

  supports(tipo: TipoNotificacion): boolean {
    return this.tiposSms.has(tipo);
  }

  async send(target: NotificationTarget, message: NotificationMessage): Promise<void> {
    await this.sms.sendNotification(target.telefono, `${message.titulo}: ${message.mensaje}`);
  }
}
