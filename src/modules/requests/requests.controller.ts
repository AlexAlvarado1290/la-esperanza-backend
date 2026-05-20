import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadoSolicitud, NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateRequestDto, RejectRequestDto } from './dto/requests.dto';
import { RequestsService } from './requests.service';

@ApiTags('Solicitudes')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Get()
  @ApiOperation({ summary: 'RF14 — Mis solicitudes (comprador) o recibidas (productor)' })
  list(@CurrentUser() user: CurrentUserPayload, @Query('estado') estado?: EstadoSolicitud) {
    return this.service.listMine({ sub: user.sub, rol: user.rol }, estado);
  }

  @Roles(NombreRol.COMPRADOR)
  @Post()
  @ApiOperation({ summary: 'RF13 — Crear solicitud de compra (comprador)' })
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, {
      sub: user.sub,
      rol: user.rol,
      estadoCuenta: user.estadoCuenta,
    });
  }

  @Roles(NombreRol.PRODUCTOR, NombreRol.ADMIN)
  @Post(':id/reject')
  @ApiOperation({ summary: 'RF16 — Rechazar solicitud (productor)' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.reject(id, dto, { sub: user.sub, rol: user.rol });
  }

  @Roles(NombreRol.COMPRADOR)
  @Delete(':id')
  @ApiOperation({ summary: 'RF20 — Cancelar solicitud propia (comprador, antes de aceptar)' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.cancelByBuyer(id, { sub: user.sub }, motivo);
  }
}
