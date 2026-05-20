import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [ProductsModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
