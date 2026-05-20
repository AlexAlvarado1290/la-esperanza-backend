import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/master-data.dto';

@ApiTags('Catálogos maestros')
@ApiBearerAuth()
@Controller('master-data/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de categorías activas (o todas para admin con ?all=true)' })
  list(@Query('all') all?: string) {
    return this.service.list(all === 'true');
  }

  @Roles(NombreRol.ADMIN)
  @Post()
  @ApiOperation({ summary: 'RF23 — Crear categoría' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.sub);
  }

  @Roles(NombreRol.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'RF23 — Editar / activar / desactivar categoría' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }
}
