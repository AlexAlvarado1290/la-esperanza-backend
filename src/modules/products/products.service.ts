import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoMaestro, EstadoProducto, NombreRol, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEvent } from '../../common/events/domain-events';
import { ProductsRepository } from './products.repository';
import { CreateProductDto, UpdateProductDto } from './dto/products.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // RF10 — productos del productor autenticado.
  async listOwn(idProductor: number, estado?: EstadoProducto) {
    const [items, counts] = await Promise.all([
      this.repo.findOwn(idProductor, estado),
      this.repo.countByStatusForUser(idProductor),
    ]);
    const summary = counts.reduce(
      (acc, c) => ({ ...acc, [c.estadoProducto]: c._count._all }),
      { DISPONIBLE: 0, AGOTADO: 0, RETIRADO: 0 } as Record<string, number>,
    );
    return { items, summary };
  }

  // RF07.
  async create(dto: CreateProductDto, idProductor: number) {
    const [cat, uni] = await Promise.all([
      this.prisma.categoriaProducto.findUnique({ where: { idCategoria: dto.idCategoria } }),
      this.prisma.unidadMedida.findUnique({ where: { idUnidad: dto.idUnidad } }),
    ]);
    if (!cat || cat.estado === EstadoMaestro.INACTIVO)
      throw new BadRequestException('Categoría inválida o inactiva. Contacta a la Asociación.');
    if (!uni || uni.estado === EstadoMaestro.INACTIVO)
      throw new BadRequestException('Unidad inválida o inactiva. Contacta a la Asociación.');

    const estadoInicial =
      dto.cantidadDisponible > 0 ? EstadoProducto.DISPONIBLE : EstadoProducto.AGOTADO;

    const created = await this.repo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      cantidadDisponible: new Prisma.Decimal(dto.cantidadDisponible),
      precioReferencial: new Prisma.Decimal(dto.precioReferencial),
      estadoProducto: estadoInicial,
      productor: { connect: { idUsuario: idProductor } },
      categoria: { connect: { idCategoria: dto.idCategoria } },
      unidad: { connect: { idUnidad: dto.idUnidad } },
    });

    this.events.emit(DomainEvent.ProductoCreado, {
      idUsuario: idProductor,
      accion: 'producto.creado',
      entidad: 'producto',
      entidadId: String(created.idProducto),
      valorDespues: created,
    });
    return created;
  }

  // RF08.
  async update(id: number, dto: UpdateProductDto, actor: { sub: number; rol: NombreRol }) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Producto no encontrado');
    if (existing.idProductor !== actor.sub && actor.rol !== NombreRol.ADMIN) {
      throw new ForbiddenException('Sólo el productor dueño puede editar este producto.');
    }
    if (existing.estadoProducto === EstadoProducto.RETIRADO) {
      throw new BadRequestException(
        'Producto retirado no puede editarse. Crea una nueva publicación.',
      );
    }

    const data: Prisma.ProductoUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.idCategoria !== undefined) data.categoria = { connect: { idCategoria: dto.idCategoria } };
    if (dto.idUnidad !== undefined) data.unidad = { connect: { idUnidad: dto.idUnidad } };
    if (dto.precioReferencial !== undefined)
      data.precioReferencial = new Prisma.Decimal(dto.precioReferencial);
    if (dto.cantidadDisponible !== undefined) {
      data.cantidadDisponible = new Prisma.Decimal(dto.cantidadDisponible);
      // RF08 — cantidad en cero pasa a AGOTADO automáticamente.
      data.estadoProducto =
        dto.cantidadDisponible === 0 ? EstadoProducto.AGOTADO : EstadoProducto.DISPONIBLE;
    }
    if (dto.estadoProducto !== undefined) data.estadoProducto = dto.estadoProducto;

    const updated = await this.repo.update(id, data);
    this.events.emit(DomainEvent.ProductoEditado, {
      idUsuario: actor.sub,
      accion: 'producto.editado',
      entidad: 'producto',
      entidadId: String(id),
      valorAntes: existing,
      valorDespues: updated,
    });
    return updated;
  }

  // RF09.
  async retire(id: number, actor: { sub: number; rol: NombreRol }) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Producto no encontrado');
    if (existing.idProductor !== actor.sub && actor.rol !== NombreRol.ADMIN) {
      throw new ForbiddenException('Sólo el productor dueño puede retirar este producto.');
    }
    if (existing.estadoProducto === EstadoProducto.RETIRADO) {
      return existing;
    }
    const updated = await this.repo.update(id, { estadoProducto: EstadoProducto.RETIRADO });
    this.events.emit(DomainEvent.ProductoRetirado, {
      idUsuario: actor.sub,
      accion: 'producto.retirado',
      entidad: 'producto',
      entidadId: String(id),
      valorAntes: existing,
      valorDespues: updated,
    });
    return updated;
  }
}
