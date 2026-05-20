// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoCuenta, EstadoProducto, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // RF11 — catálogo público: oculta retirados y los del productor suspendido.
  publicSearch(opts: {
    q?: string;
    idCategoria?: number;
    minPrecio?: number;
    maxPrecio?: number;
    orderBy?: 'precio' | 'nombre' | 'fecha' | 'cantidad';
    order?: 'asc' | 'desc';
  }) {
    const order = opts.order ?? 'desc';
    let orderBy: Prisma.ProductoOrderByWithRelationInput = { fechaPublicacion: order };
    if (opts.orderBy === 'precio') orderBy = { precioReferencial: order };
    if (opts.orderBy === 'nombre') orderBy = { nombre: order };
    if (opts.orderBy === 'cantidad') orderBy = { cantidadDisponible: order };
    return this.prisma.producto.findMany({
      where: {
        estadoProducto: { not: EstadoProducto.RETIRADO },
        productor: { estadoCuenta: EstadoCuenta.ACTIVO },
        ...(opts.q
          ? {
              OR: [
                { nombre: { contains: opts.q, mode: 'insensitive' } },
                { categoria: { nombre: { contains: opts.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(opts.idCategoria ? { idCategoria: opts.idCategoria } : {}),
        ...(opts.minPrecio || opts.maxPrecio
          ? {
              precioReferencial: {
                ...(opts.minPrecio ? { gte: opts.minPrecio } : {}),
                ...(opts.maxPrecio ? { lte: opts.maxPrecio } : {}),
              },
            }
          : {}),
      },
      include: {
        categoria: true,
        unidad: true,
        productor: { select: { idUsuario: true, nombreCompleto: true } },
      },
      orderBy,
    });
  }

  publicFindOne(id: number) {
    return this.prisma.producto.findFirst({
      where: {
        idProducto: id,
        estadoProducto: { not: EstadoProducto.RETIRADO },
        productor: { estadoCuenta: EstadoCuenta.ACTIVO },
      },
      include: {
        categoria: true,
        unidad: true,
        productor: { select: { idUsuario: true, nombreCompleto: true } },
      },
    });
  }

  findOwn(idProductor: number, estado?: EstadoProducto) {
    return this.prisma.producto.findMany({
      where: { idProductor, ...(estado ? { estadoProducto: estado } : {}) },
      include: { categoria: true, unidad: true },
      orderBy: { fechaPublicacion: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.producto.findUnique({
      where: { idProducto: id },
      include: { categoria: true, unidad: true, productor: true },
    });
  }

  create(data: Prisma.ProductoCreateInput) {
    return this.prisma.producto.create({ data, include: { categoria: true, unidad: true } });
  }

  update(id: number, data: Prisma.ProductoUpdateInput) {
    return this.prisma.producto.update({
      where: { idProducto: id },
      data,
      include: { categoria: true, unidad: true },
    });
  }

  countByStatusForUser(idProductor: number) {
    return this.prisma.producto.groupBy({
      by: ['estadoProducto'],
      where: { idProductor },
      _count: { _all: true },
    });
  }
}
