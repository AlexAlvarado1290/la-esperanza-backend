// RF34/RF35 — Reportes y KPIs.
// Los reportes generales son anonimizados (sin identificadores individuales)
// conforme al DERCAS §2.8 / RF34.

import { Injectable } from '@nestjs/common';
import { EstadoAcuerdo, EstadoCuenta, EstadoFinal, NombreRol } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // RF34 — KPIs generales (admin).
  async general(filtros: { desde?: Date; hasta?: Date }) {
    const fechaFilter = filtros.desde || filtros.hasta
      ? {
          ...(filtros.desde ? { gte: filtros.desde } : {}),
          ...(filtros.hasta ? { lte: filtros.hasta } : {}),
        }
      : undefined;

    const [productoresActivos, compradoresActivos, productos, solicitudes, completadas, canceladas, incidencias] =
      await Promise.all([
        this.prisma.usuario.count({
          where: { estadoCuenta: EstadoCuenta.ACTIVO, rol: { nombre: NombreRol.PRODUCTOR } },
        }),
        this.prisma.usuario.count({
          where: { estadoCuenta: EstadoCuenta.ACTIVO, rol: { nombre: NombreRol.COMPRADOR } },
        }),
        this.prisma.producto.count(),
        this.prisma.solicitudCompra.count({
          where: fechaFilter ? { fechaSolicitud: fechaFilter } : {},
        }),
        this.prisma.acuerdoComercial.count({ where: { estadoFinal: EstadoFinal.CONFIRMADA } }),
        this.prisma.acuerdoComercial.count({ where: { estadoFinal: EstadoFinal.CANCELADA } }),
        this.prisma.reporteIncidencia.count(),
      ]);

    // Ventas por categoría (anonimizado).
    const acuerdosConfirmados = await this.prisma.acuerdoComercial.findMany({
      where: { estadoFinal: EstadoFinal.CONFIRMADA },
      include: { solicitud: { include: { producto: { include: { categoria: true } } } } },
    });
    const ventasPorCategoria = acuerdosConfirmados.reduce<Record<string, { total: number; cantidad: number }>>(
      (acc, a) => {
        const cat = a.solicitud.producto.categoria.nombre;
        if (!acc[cat]) acc[cat] = { total: 0, cantidad: 0 };
        acc[cat].total += Number(a.precioFinal) * Number(a.cantidadAcordada);
        acc[cat].cantidad += Number(a.cantidadAcordada);
        return acc;
      },
      {},
    );

    // Solicitudes por mes.
    const todasSolicitudes = await this.prisma.solicitudCompra.findMany({
      where: fechaFilter ? { fechaSolicitud: fechaFilter } : {},
      select: { fechaSolicitud: true },
    });
    const solicitudesPorMes = todasSolicitudes.reduce<Record<string, number>>((acc, s) => {
      const key = s.fechaSolicitud.toISOString().slice(0, 7);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    // Distribución de estados de acuerdo.
    const distribucionAcuerdos = await this.prisma.acuerdoComercial.groupBy({
      by: ['estadoAcuerdo'],
      _count: { _all: true },
    });

    return {
      kpis: {
        productoresActivos,
        compradoresActivos,
        productosPublicados: productos,
        solicitudesEnRango: solicitudes,
        entregasCompletadas: completadas,
        entregasCanceladas: canceladas,
        incidenciasTotales: incidencias,
      },
      ventasPorCategoria,
      solicitudesPorMes,
      distribucionAcuerdos: distribucionAcuerdos.map((d) => ({
        estado: d.estadoAcuerdo,
        total: d._count._all,
      })),
    };
  }

  // RF35 — Historial de ventas del productor.
  async salesHistory(idProductor: number, year?: number) {
    const yearFilter = year
      ? {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lte: new Date(`${year}-12-31T23:59:59Z`),
        }
      : undefined;

    const acuerdos = await this.prisma.acuerdoComercial.findMany({
      where: {
        solicitud: { producto: { idProductor } },
        ...(yearFilter ? { fechaProgramada: yearFilter } : {}),
      },
      include: {
        solicitud: {
          include: {
            producto: { include: { categoria: true, unidad: true } },
            comprador: { select: { idUsuario: true, nombreCompleto: true } },
          },
        },
        puntoEntrega: true,
      },
      orderBy: { fechaProgramada: 'desc' },
    });

    const confirmadas = acuerdos.filter((a) => a.estadoFinal === EstadoFinal.CONFIRMADA);
    const incumplidas = acuerdos.filter((a) => a.estadoFinal === EstadoFinal.INCUMPLIDA);
    const totalVendido = confirmadas.reduce(
      (s, a) => s + Number(a.precioFinal) * Number(a.cantidadAcordada),
      0,
    );

    // Ingresos mensuales (de confirmadas).
    const ingresosMensuales = confirmadas.reduce<Record<string, number>>((acc, a) => {
      const key = a.fechaProgramada.toISOString().slice(0, 7);
      acc[key] = (acc[key] ?? 0) + Number(a.precioFinal) * Number(a.cantidadAcordada);
      return acc;
    }, {});

    const tasaCumplimiento =
      acuerdos.length > 0
        ? Math.round((confirmadas.length / acuerdos.length) * 100)
        : 0;

    return {
      resumen: {
        totalVendido,
        entregasConfirmadas: confirmadas.length,
        entregasIncumplidas: incumplidas.length,
        totalAcuerdos: acuerdos.length,
        tasaCumplimiento,
      },
      ingresosMensuales,
      acuerdos,
    };
  }
}
