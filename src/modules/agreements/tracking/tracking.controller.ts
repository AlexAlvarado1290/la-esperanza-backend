import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { TrackingService } from './tracking.service';

@ApiTags('Acuerdos')
@ApiBearerAuth()
@Controller('agreements/:id/tracking')
export class TrackingController {
  constructor(private readonly service: TrackingService) {}

  @Get()
  @ApiOperation({ summary: 'RF36 — Bitácora cronológica del acuerdo' })
  list(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.service.list(id, { sub: user.sub, rol: user.rol });
  }
}
