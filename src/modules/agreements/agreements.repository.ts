// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoAcuerdo, NombreRol, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AgreementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // RF22 — listado de acuerdos del usuario (o todos para admin).
  list(actor: { sub: number; rol: NombreRol }, estado?: EstadoAcuerdo) {
    const baseWhere: Prisma.AcuerdoComercialWhereInput = estado ? { estadoAcuerdo: estado } : {};
    if (actor.rol === NombreRol.ADMIN) {
      return this.prisma.acuerdoComercial.findMany({
        where: baseWhere,
        include: this.includeAcuerdo(),
        orderBy: { idAcuerdo: 'desc' },
      });
    }
    if (actor.rol === NombreRol.COMPRADOR) {
      return this.prisma.acuerdoComercial.findMany({
        where: { ...baseWhere, solicitud: { idComprador: actor.sub } },
        include: this.includeAcuerdo(),
        orderBy: { idAcuerdo: 'desc' },
      });
    }
    // PRODUCTOR
    return this.prisma.acuerdoComercial.findMany({
      where: {
        ...baseWhere,
        solicitud: { producto: { idProductor: actor.sub } },
      },
      include: this.includeAcuerdo(),
      orderBy: { idAcuerdo: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.acuerdoComercial.findUnique({
      where: { idAcuerdo: id },
      include: this.includeAcuerdo(),
    });
  }

  private includeAcuerdo() {
    return {
      puntoEntrega: true,
      solicitud: {
        include: {
          comprador: { select: { idUsuario: true, nombreCompleto: true, telefono: true } },
          producto: {
            include: {
              categoria: true,
              unidad: true,
              productor: { select: { idUsuario: true, nombreCompleto: true, telefono: true } },
            },
          },
        },
      },
      seguimientos: {
        include: { usuario: { select: { idUsuario: true, nombreCompleto: true } } },
        orderBy: { fechaHora: 'asc' as const },
      },
      mensajes: {
        include: { remitente: { select: { idUsuario: true, nombreCompleto: true } } },
        orderBy: { fechaHora: 'asc' as const },
      },
      incidencias: true,
    };
  }
}
