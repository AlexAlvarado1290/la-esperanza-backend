// PATRÓN: Repository

import { Injectable } from '@nestjs/common';
import { Prisma, TipoNotificacion } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    idUsuario: number;
    tipo: TipoNotificacion;
    titulo: string;
    mensaje: string;
    payload?: Prisma.InputJsonValue;
  }) {
    return this.prisma.notificacion.create({
      data: {
        idUsuario: data.idUsuario,
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
        ...(data.payload !== undefined ? { payload: data.payload } : {}),
      },
    });
  }

  listForUser(idUsuario: number, soloNoLeidas = false) {
    return this.prisma.notificacion.findMany({
      where: { idUsuario, ...(soloNoLeidas ? { leida: false } : {}) },
      orderBy: { fechaCreacion: 'desc' },
      take: 100,
    });
  }

  countUnread(idUsuario: number) {
    return this.prisma.notificacion.count({ where: { idUsuario, leida: false } });
  }

  markAsRead(idUsuario: number, idNotificacion: number) {
    return this.prisma.notificacion.updateMany({
      where: { idNotificacion, idUsuario },
      data: { leida: true },
    });
  }

  markAllAsRead(idUsuario: number) {
    return this.prisma.notificacion.updateMany({
      where: { idUsuario, leida: false },
      data: { leida: true },
    });
  }
}
