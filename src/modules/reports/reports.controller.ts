import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Roles(NombreRol.ADMIN)
  @Get('general')
  @ApiOperation({ summary: 'RF34 — Reportes generales (KPIs anónimos agregados)' })
  general(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.general({
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    });
  }

  @Roles(NombreRol.PRODUCTOR, NombreRol.ADMIN)
  @Get('sales-history')
  @ApiOperation({ summary: 'RF35 — Historial de ventas del productor autenticado' })
  salesHistory(@CurrentUser() user: CurrentUserPayload, @Query('year') year?: string) {
    return this.service.salesHistory(user.sub, year ? Number(year) : undefined);
  }
}
