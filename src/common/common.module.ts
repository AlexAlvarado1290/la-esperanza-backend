import { Global, Logger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { SMS_ADAPTER, SmartlaSmsAdapter, StubSmsAdapter } from './adapters/sms.adapter';

// PATRÓN: Factory Method — el provider de SmsAdapter retorna la implementación
// stub o una real (Smartla, Twilio, ...) según la variable de entorno SMS_PROVIDER.
const smsAdapterProvider = {
  provide: SMS_ADAPTER,
  useFactory: () => {
    const provider = process.env.SMS_PROVIDER ?? 'stub';
    const logger = new Logger('SmsAdapterFactory');
    switch (provider) {
      case 'smartla': {
        const baseUrl =
          process.env.SMS_API_URL ?? 'https://api.smartla.net/smart-messaging-gw/notification';
        const apiKey = process.env.SMS_API_TOKEN;
        const countryId = process.env.SMS_COUNTRY_ID ?? '502';
        if (!apiKey) {
          logger.warn(
            'SMS_PROVIDER=smartla pero SMS_API_TOKEN no está definido; cayendo a stub.',
          );
          return new StubSmsAdapter();
        }
        logger.log(`Usando proveedor SMS=smartla baseUrl=${baseUrl} countryId=${countryId}`);
        return new SmartlaSmsAdapter(baseUrl, apiKey, countryId);
      }
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
