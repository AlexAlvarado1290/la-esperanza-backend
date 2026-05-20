import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { RequestsRepository } from './requests.repository';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, RequestsRepository],
  exports: [RequestsRepository, RequestsService],
})
export class RequestsModule {}
