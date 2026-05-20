// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoMaestro, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DeliveryPointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.puntoEntrega.findMany({
      where: includeInactive ? {} : { estado: EstadoMaestro.ACTIVO },
      orderBy: { nombre: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.puntoEntrega.findUnique({ where: { idPuntoEntrega: id } });
  }

  findByNombre(nombre: string) {
    return this.prisma.puntoEntrega.findUnique({ where: { nombre } });
  }

  create(data: Prisma.PuntoEntregaCreateInput) {
    return this.prisma.puntoEntrega.create({ data });
  }

  update(id: number, data: Prisma.PuntoEntregaUpdateInput) {
    return this.prisma.puntoEntrega.update({ where: { idPuntoEntrega: id }, data });
  }
}
