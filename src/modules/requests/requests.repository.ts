// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoSolicitud, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByComprador(idComprador: number, estado?: EstadoSolicitud) {
    return this.prisma.solicitudCompra.findMany({
      where: { idComprador, ...(estado ? { estadoSolicitud: estado } : {}) },
      include: {
        producto: { include: { categoria: true, unidad: true, productor: true } },
        acuerdo: true,
      },
      orderBy: { fechaSolicitud: 'desc' },
    });
  }

  findByProductor(idProductor: number, estado?: EstadoSolicitud) {
    return this.prisma.solicitudCompra.findMany({
      where: {
        producto: { idProductor },
        ...(estado ? { estadoSolicitud: estado } : {}),
      },
      include: {
        comprador: { select: { idUsuario: true, nombreCompleto: true, telefono: true } },
        producto: { include: { categoria: true, unidad: true } },
        acuerdo: true,
      },
      orderBy: { fechaSolicitud: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.solicitudCompra.findUnique({
      where: { idSolicitud: id },
      include: {
        comprador: true,
        producto: { include: { categoria: true, unidad: true, productor: true } },
        acuerdo: true,
      },
    });
  }

  create(data: Prisma.SolicitudCompraCreateInput) {
    return this.prisma.solicitudCompra.create({ data, include: { producto: true } });
  }

  update(id: number, data: Prisma.SolicitudCompraUpdateInput) {
    return this.prisma.solicitudCompra.update({ where: { idSolicitud: id }, data });
  }
}
