import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../common/events/domain-events';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/master-data.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    private readonly events: EventEmitter2,
  ) {}

  list(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async create(dto: CreateCategoryDto, actorId: number) {
    const dup = await this.repo.findByNombre(dto.nombre);
    if (dup) throw new BadRequestException(`Ya existe una categoría con nombre "${dto.nombre}".`);
    const created = await this.repo.create({ nombre: dto.nombre, descripcion: dto.descripcion });
    this.events.emit(DomainEvent.CatalogoMaestroCreado, {
      idUsuario: actorId,
      accion: 'categoria.creada',
      entidad: 'categoria_producto',
      entidadId: String(created.idCategoria),
      valorDespues: created,
    });
    return created;
  }

  async update(id: number, dto: UpdateCategoryDto, actorId: number) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Categoría no encontrada');
    if (dto.nombre && dto.nombre !== existing.nombre) {
      const dup = await this.repo.findByNombre(dto.nombre);
      if (dup) throw new BadRequestException('Nombre ya en uso por otra categoría.');
    }
    const updated = await this.repo.update(id, dto);
    this.events.emit(DomainEvent.CatalogoMaestroEditado, {
      idUsuario: actorId,
      accion: 'categoria.editada',
      entidad: 'categoria_producto',
      entidadId: String(id),
      valorAntes: existing,
      valorDespues: updated,
    });
    return updated;
  }
}
