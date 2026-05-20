import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { AgreementsRepository } from './agreements.repository';
import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { TrackingController } from './tracking/tracking.controller';
import { TrackingService } from './tracking/tracking.service';

// PATRÓN: State — AgreementStateMachine encapsula las transiciones del acuerdo.
// PATRÓN: Repository — AgreementsRepository encapsula Prisma.

@Module({
  imports: [RequestsModule],
  controllers: [AgreementsController, MessagesController, TrackingController],
  providers: [
    AgreementsService,
    AgreementsRepository,
    MessagesService,
    TrackingService,
  ],
  exports: [AgreementsService, AgreementsRepository],
})
export class AgreementsModule {}
