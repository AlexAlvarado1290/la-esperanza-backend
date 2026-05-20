import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadoAcuerdo, NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AgreementsService } from './agreements.service';
import { AcceptRequestDto, CancelDto, TransitionDto, UpdatePagoDto } from './dto/agreements.dto';

@ApiTags('Acuerdos')
@ApiBearerAuth()
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly service: AgreementsService) {}

  @Get()
  @ApiOperation({ summary: 'RF22 — Mis acuerdos / mis compras (filtrado por rol)' })
  list(@CurrentUser() user: CurrentUserPayload, @Query('estado') estado?: EstadoAcuerdo) {
    return this.service.list({ sub: user.sub, rol: user.rol }, estado);
  }

  @Get(':id')
  @ApiOperation({ summary: 'RF36 — Detalle del acuerdo con bitácora y mensajes' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.service.findOne(id, { sub: user.sub, rol: user.rol });
  }

  @Roles(NombreRol.PRODUCTOR, NombreRol.ADMIN)
  @Post('from-request/:idSolicitud')
  @ApiOperation({ summary: 'RF15 — Aceptar solicitud y crear acuerdo (UC15+UC16)' })
  accept(
    @Param('idSolicitud', ParseIntPipe) idSolicitud: number,
    @Body() dto: AcceptRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.acceptRequest(idSolicitud, dto, { sub: user.sub, rol: user.rol });
  }

  @Patch(':id/transition')
  @ApiOperation({
    summary: 'RF17 — Avanzar estado del acuerdo (productor) o confirmar recepción (comprador)',
  })
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.transition(id, dto, { sub: user.sub, rol: user.rol });
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'RF20 — Cancelar acuerdo con motivo obligatorio' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.cancel(id, dto, { sub: user.sub, rol: user.rol });
  }

  @Roles(NombreRol.PRODUCTOR, NombreRol.ADMIN)
  @Patch(':id/pago')
  @ApiOperation({ summary: 'RF19 — Registrar estado de pago' })
  updatePago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePagoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.updatePago(id, dto, { sub: user.sub, rol: user.rol });
  }
}
