// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoMaestro, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.unidadMedida.findMany({
      where: includeInactive ? {} : { estado: EstadoMaestro.ACTIVO },
      orderBy: { nombre: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.unidadMedida.findUnique({ where: { idUnidad: id } });
  }

  findByAbreviatura(abreviatura: string) {
    return this.prisma.unidadMedida.findUnique({ where: { abreviatura } });
  }

  findByNombre(nombre: string) {
    return this.prisma.unidadMedida.findUnique({ where: { nombre } });
  }

  create(data: Prisma.UnidadMedidaCreateInput) {
    return this.prisma.unidadMedida.create({ data });
  }

  update(id: number, data: Prisma.UnidadMedidaUpdateInput) {
    return this.prisma.unidadMedida.update({ where: { idUnidad: id }, data });
  }
}
