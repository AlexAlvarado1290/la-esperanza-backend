import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { NotificationsRepository } from './notifications.repository';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly repo: NotificationsRepository) {}

  @Get()
  @ApiOperation({ summary: 'RF38 — Listado de notificaciones in-app del usuario actual' })
  list(@CurrentUser() user: CurrentUserPayload, @Query('unread') unread?: string) {
    return this.repo.listForUser(user.sub, unread === 'true');
  }

  @Get('count-unread')
  @ApiOperation({ summary: 'Conteo de notificaciones no leídas (para el badge)' })
  async countUnread(@CurrentUser() user: CurrentUserPayload) {
    return { unread: await this.repo.countUnread(user.sub) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseIntPipe) id: number) {
    return this.repo.markAsRead(user.sub, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  markAll(@CurrentUser() user: CurrentUserPayload) {
    return this.repo.markAllAsRead(user.sub);
  }
}
