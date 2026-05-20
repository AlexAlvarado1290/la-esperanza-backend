import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from './dto/master-data.dto';

@ApiTags('Catálogos maestros')
@ApiBearerAuth()
@Controller('master-data/units')
export class UnitsController {
  constructor(private readonly service: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de unidades de medida' })
  list(@Query('all') all?: string) {
    return this.service.list(all === 'true');
  }

  @Roles(NombreRol.ADMIN)
  @Post()
  @ApiOperation({ summary: 'RF24 — Crear unidad' })
  create(@Body() dto: CreateUnitDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.sub);
  }

  @Roles(NombreRol.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'RF24 — Editar / activar / desactivar unidad' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }
}
