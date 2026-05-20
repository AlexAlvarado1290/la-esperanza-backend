import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { UnitsRepository } from './units.repository';
import { DeliveryPointsController } from './delivery-points.controller';
import { DeliveryPointsService } from './delivery-points.service';
import { DeliveryPointsRepository } from './delivery-points.repository';

// PATRÓN: Repository — cada catálogo maestro encapsula Prisma (RF23, RF24, RF25).

@Module({
  controllers: [CategoriesController, UnitsController, DeliveryPointsController],
  providers: [
    CategoriesService,
    CategoriesRepository,
    UnitsService,
    UnitsRepository,
    DeliveryPointsService,
    DeliveryPointsRepository,
  ],
  exports: [CategoriesRepository, UnitsRepository, DeliveryPointsRepository],
})
export class MasterDataModule {}
