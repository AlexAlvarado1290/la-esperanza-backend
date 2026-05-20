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
import { EstadoReporte } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateIncidentDto, ResolveIncidentDto } from './dto/incidents.dto';
import { IncidentsService } from './incidents.service';

@ApiTags('Incidencias')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar incidencias (admin: todas; otros: las propias)' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('estado') estado?: EstadoReporte,
    @Query('idAcuerdo') idAcuerdo?: string,
  ) {
    return this.service.list({
      estado,
      idAcuerdo: idAcuerdo ? Number(idAcuerdo) : undefined,
      actor: { sub: user.sub, rol: user.rol },
    });
  }

  @Post('agreements/:idAcuerdo')
  @ApiOperation({ summary: 'RF31 — Reportar inconformidad sobre un acuerdo' })
  report(
    @Param('idAcuerdo', ParseIntPipe) idAcuerdo: number,
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.report(idAcuerdo, dto, { sub: user.sub, rol: user.rol });
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'RF32 — Registrar resolución (admin)' })
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveIncidentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.resolve(id, dto, { sub: user.sub, rol: user.rol });
  }
}
