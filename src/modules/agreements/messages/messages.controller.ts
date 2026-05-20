import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';

@ApiTags('Acuerdos')
@ApiBearerAuth()
@Controller('agreements/:id/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'RF21 — Listar mensajes del acuerdo' })
  list(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.service.list(id, { sub: user.sub, rol: user.rol });
  }

  @Post()
  @ApiOperation({ summary: 'RF21 — Enviar mensaje en el acuerdo' })
  send(
    @Param('id', ParseIntPipe) id: number,
    @Body('mensaje') mensaje: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.send(id, mensaje, { sub: user.sub, rol: user.rol });
  }
}
