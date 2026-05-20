// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoReporte, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class IncidentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { estado?: EstadoReporte; idAcuerdo?: number; idReportante?: number }) {
    return this.prisma.reporteIncidencia.findMany({
      where: {
        ...(filters.estado ? { estadoReporte: filters.estado } : {}),
        ...(filters.idAcuerdo ? { idAcuerdo: filters.idAcuerdo } : {}),
        ...(filters.idReportante ? { idReportante: filters.idReportante } : {}),
      },
      include: {
        reportante: { select: { idUsuario: true, nombreCompleto: true } },
        acuerdo: {
          include: {
            solicitud: {
              include: {
                producto: { include: { productor: true } },
                comprador: true,
              },
            },
          },
        },
      },
      orderBy: { fechaReporte: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.reporteIncidencia.findUnique({
      where: { idReporte: id },
      include: {
        reportante: true,
        acuerdo: {
          include: {
            solicitud: {
              include: { producto: { include: { productor: true } }, comprador: true },
            },
          },
        },
      },
    });
  }

  create(data: Prisma.ReporteIncidenciaCreateInput) {
    return this.prisma.reporteIncidencia.create({ data });
  }

  update(id: number, data: Prisma.ReporteIncidenciaUpdateInput) {
    return this.prisma.reporteIncidencia.update({ where: { idReporte: id }, data });
  }
}
