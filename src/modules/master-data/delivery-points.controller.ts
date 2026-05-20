import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeliveryPointsService } from './delivery-points.service';
import { CreateDeliveryPointDto, UpdateDeliveryPointDto } from './dto/master-data.dto';

@ApiTags('Catálogos maestros')
@ApiBearerAuth()
@Controller('master-data/delivery-points')
export class DeliveryPointsController {
  constructor(private readonly service: DeliveryPointsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de puntos de entrega' })
  list(@Query('all') all?: string) {
    return this.service.list(all === 'true');
  }

  @Roles(NombreRol.ADMIN)
  @Post()
  @ApiOperation({ summary: 'RF25 — Crear punto de entrega' })
  create(@Body() dto: CreateDeliveryPointDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.sub);
  }

  @Roles(NombreRol.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'RF25 — Editar / activar / desactivar punto de entrega' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryPointDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }
}
