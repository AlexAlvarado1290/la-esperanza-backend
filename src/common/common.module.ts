import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { SMS_ADAPTER, StubSmsAdapter } from './adapters/sms.adapter';

// PATRÓN: Factory Method — el provider de SmsAdapter retorna la implementación
// stub o una real (Twilio) según la variable de entorno SMS_PROVIDER.
const smsAdapterProvider = {
  provide: SMS_ADAPTER,
  useFactory: () => {
    const provider = process.env.SMS_PROVIDER ?? 'stub';
    switch (provider) {
      case 'stub':
      default:
        return new StubSmsAdapter();
    }
  },
};

@Global()
@Module({
  providers: [
    smsAdapterProvider,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [SMS_ADAPTER],
})
export class CommonModule {}
