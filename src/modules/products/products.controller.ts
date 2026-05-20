import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadoProducto, NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/products.dto';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Roles(NombreRol.PRODUCTOR, NombreRol.ADMIN)
  @Get('mine')
  @ApiOperation({ summary: 'RF10 — Mis productos (productor)' })
  listMine(@CurrentUser() user: CurrentUserPayload, @Query('estado') estado?: EstadoProducto) {
    return this.service.listOwn(user.sub, estado);
  }

  @Roles(NombreRol.PRODUCTOR)
  @Post()
  @ApiOperation({ summary: 'RF07 — Publicar nuevo producto' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.sub);
  }

  @Roles(NombreRol.PRODUCTOR, NombreRol.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'RF08 — Editar producto propio' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, { sub: user.sub, rol: user.rol });
  }

  @Roles(NombreRol.PRODUCTOR, NombreRol.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'RF09 — Retirar producto del catálogo (soft)' })
  retire(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.service.retire(id, { sub: user.sub, rol: user.rol });
  }
}
