// PATRÓN: Adapter — encapsula el proveedor de SMS detrás de una interfaz estable.
// Hoy soporta dos implementaciones (stub para desarrollo y Smartla para producción).
// Cualquier proveedor nuevo (Twilio, etc.) implementa la interfaz SmsAdapter sin
// que los consumidores se enteren — el `CommonModule` decide cuál instanciar.

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

// PATRÓN: Adapter — proveedor real de SMS (Smart Messaging Gateway).
// Doc: https://api.smartla.net/smart-messaging-gw/doc/index.html
// Endpoint: POST {SMS_API_URL}/sms  · Header: token: <api-key>  ·
// Body: { phoneNumber, message, countryId }
//
// Si la llamada falla NO lanzamos al consumidor: el flujo principal (alta de
// usuario, reinicio de PIN, notificación) ya no depende de que el SMS llegue.
// El log queda registrado para auditoría manual y para reintentos por job.
export class SmartlaSmsAdapter implements SmsAdapter {
  private readonly logger = new Logger('SmsAdapter:smartla');

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    /** Código numérico del país para Smartla. Guatemala = "502". */
    private readonly countryId: string,
    /** Timeout duro para no bloquear la API de la app si Smartla está lento. */
    private readonly timeoutMs = 8000,
  ) {}

  async sendVerificationCode(telefono: string, codigo: string, contexto: string): Promise<void> {
    // Sin caracteres no-GSM-7 (acentos, ·, …) para no caer a UCS-2 (truncado a 70 chars).
    const mensaje = `La Esperanza: tu PIN inicial es ${codigo}. Al iniciar sesion debes cambiarlo.`;
    await this.send(telefono, mensaje, contexto);
  }

  async sendNotification(telefono: string, mensaje: string): Promise<void> {
    await this.send(telefono, mensaje, 'notification');
  }

  private async send(telefono: string, mensaje: string, contexto: string): Promise<void> {
    const phoneNumber = this.normalizePhone(telefono);
    // Normalizamos a ASCII básico para mantener encoding GSM-7 (160 chars).
    const ascii = mensaje
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[·•]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[^\x00-\x7F]/g, '');
    const message = ascii.length > 160 ? ascii.slice(0, 157) + '...' : ascii;

    const payload = { phoneNumber, message, countryId: this.countryId };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.log({ payload, contexto }, 'POST /sms → Smartla');
      const res = await fetch(`${this.baseUrl}/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await res.text();
      let body: any;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      if (!res.ok) {
        this.logger.error(
          { status: res.status, body, to: phoneNumber, contexto },
          'Smartla rechazó el envío del SMS',
        );
        return;
      }

      this.logger.log(
        { status: res.status, body, to: phoneNumber, contexto, requestMessage: message },
        'Smartla respondió',
      );
    } catch (err: any) {
      this.logger.error(
        { err: err?.message ?? String(err), to: phoneNumber, mensaje: message },
        'Falló la llamada a Smartla',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Smartla espera el número con código de país anidado al principio y sin
   * separadores ("50230309500"). Aceptamos formatos comunes y los limpiamos:
   *   - "+502 3030 9500"  → "50230309500"
   *   - "30309500"        → countryId + número → "50230309500"
   *   - "0030309500"      → quita el 0 inicial → "50230309500"
   */
  private normalizePhone(telefono: string): string {
    const digits = telefono.replace(/\D/g, '');
    if (!digits) return digits;
    if (digits.startsWith(this.countryId)) return digits;
    // Algunos catastros guardan los teléfonos guatemaltecos con un "0" inicial
    // que no corresponde al estándar internacional.
    const sinCero = digits.replace(/^0+/, '');
    if (sinCero.length === 8) return `${this.countryId}${sinCero}`;
    return sinCero;
  }
}

export const SMS_ADAPTER = Symbol('SmsAdapter');
