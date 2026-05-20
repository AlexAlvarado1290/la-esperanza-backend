import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NombreRol } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditRepository } from './audit.repository';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Roles(NombreRol.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly repo: AuditRepository) {}

  @Get()
  @ApiOperation({ summary: 'RF37 — Bitácora de auditoría (sólo admin)' })
  list(@Query() q: QueryAuditDto) {
    return this.repo.list({
      entidad: q.entidad,
      accion: q.accion,
      idUsuario: q.idUsuario,
      desde: q.desde ? new Date(q.desde) : undefined,
      hasta: q.hasta ? new Date(q.hasta) : undefined,
      skip: q.skip ?? 0,
      take: q.take ?? 100,
    });
  }
}
