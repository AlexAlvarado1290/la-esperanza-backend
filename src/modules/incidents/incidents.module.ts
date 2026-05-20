import { Module } from '@nestjs/common';
import { AgreementsModule } from '../agreements/agreements.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { IncidentsRepository } from './incidents.repository';

@Module({
  imports: [AgreementsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentsRepository],
  exports: [IncidentsRepository],
})
export class IncidentsModule {}
