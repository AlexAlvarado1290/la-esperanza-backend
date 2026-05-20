import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProductsRepository } from '../products/products.repository';

@ApiTags('Catálogo')
@Public() // RF02 — invitado puede ver el catálogo sin iniciar sesión.
@Controller('catalog')
export class CatalogController {
  constructor(private readonly repo: ProductsRepository) {}

  @Get('products')
  @ApiOperation({
    summary: 'RF11 — Catálogo público con búsqueda, filtros y ordenamiento',
  })
  list(
    @Query('q') q?: string,
    @Query('categoria') categoria?: string,
    @Query('minPrecio') minPrecio?: string,
    @Query('maxPrecio') maxPrecio?: string,
    @Query('orderBy') orderBy?: 'precio' | 'nombre' | 'fecha' | 'cantidad',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.repo.publicSearch({
      q,
      idCategoria: categoria ? Number(categoria) : undefined,
      minPrecio: minPrecio ? Number(minPrecio) : undefined,
      maxPrecio: maxPrecio ? Number(maxPrecio) : undefined,
      orderBy,
      order,
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'RF12 — Detalle de un producto en catálogo' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.repo.publicFindOne(id);
    if (!item) throw new NotFoundException('Producto no disponible o retirado.');
    return item;
  }
}
