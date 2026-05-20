// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoMaestro, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.categoriaProducto.findMany({
      where: includeInactive ? {} : { estado: EstadoMaestro.ACTIVO },
      orderBy: { nombre: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.categoriaProducto.findUnique({ where: { idCategoria: id } });
  }

  findByNombre(nombre: string) {
    return this.prisma.categoriaProducto.findUnique({ where: { nombre } });
  }

  create(data: Prisma.CategoriaProductoCreateInput) {
    return this.prisma.categoriaProducto.create({ data });
  }

  update(id: number, data: Prisma.CategoriaProductoUpdateInput) {
    return this.prisma.categoriaProducto.update({ where: { idCategoria: id }, data });
  }
}
