// PATRÓN: Repository

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditEntry {
  idUsuario?: number;
  accion: string;
  entidad: string;
  entidadId?: string;
  valorAntes?: unknown;
  valorDespues?: unknown;
  resultado?: 'OK' | 'DENIED' | 'ERROR';
  ip?: string;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        idUsuario: entry.idUsuario ?? null,
        accion: entry.accion,
        entidad: entry.entidad,
        entidadId: entry.entidadId ?? null,
        valorAntes: (entry.valorAntes ?? null) as Prisma.InputJsonValue,
        valorDespues: (entry.valorDespues ?? null) as Prisma.InputJsonValue,
        resultado: entry.resultado ?? 'OK',
        ip: entry.ip ?? null,
      },
    });
  }

  list(filters: {
    entidad?: string;
    accion?: string;
    idUsuario?: number;
    desde?: Date;
    hasta?: Date;
    skip?: number;
    take?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.entidad ? { entidad: filters.entidad } : {}),
        ...(filters.accion ? { accion: { contains: filters.accion } } : {}),
        ...(filters.idUsuario ? { idUsuario: filters.idUsuario } : {}),
        ...(filters.desde || filters.hasta
          ? {
              fechaHora: {
                ...(filters.desde ? { gte: filters.desde } : {}),
                ...(filters.hasta ? { lte: filters.hasta } : {}),
              },
            }
          : {}),
      },
      include: { usuario: { select: { nombreCompleto: true, telefono: true } } },
      orderBy: { fechaHora: 'desc' },
      skip: filters.skip ?? 0,
      take: filters.take ?? 100,
    });
  }
}
