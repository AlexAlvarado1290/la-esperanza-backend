// PATRÓN: Adapter — encapsula el proveedor de SMS detrás de una interfaz estable.
// En esta versión sólo loguea el código a consola (stub), la interfaz queda lista
// para enchufar Twilio en una fase posterior sin tocar a los consumidores.

import { Injectable, Logger } from '@nestjs/common';

export interface SmsAdapter {
  sendVerificationCode(telefono: string, codigo: string, contexto: string): Promise<void>;
  sendNotification(telefono: string, mensaje: string): Promise<void>;
}

@Injectable()
export class StubSmsAdapter implements SmsAdapter {
  private readonly logger = new Logger('SmsAdapter:stub');

  async sendVerificationCode(telefono: string, codigo: string, contexto: string): Promise<void> {
    this.logger.log(`SMS_STUB code=${codigo} to=${telefono} context=${contexto}`);
  }

  async sendNotification(telefono: string, mensaje: string): Promise<void> {
    this.logger.log(`SMS_STUB notification to=${telefono} msg="${mensaje}"`);
  }
}

export const SMS_ADAPTER = Symbol('SmsAdapter');
