import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../common/events/domain-events';
import { UnitsRepository } from './units.repository';
import { CreateUnitDto, UpdateUnitDto } from './dto/master-data.dto';

@Injectable()
export class UnitsService {
  constructor(
    private readonly repo: UnitsRepository,
    private readonly events: EventEmitter2,
  ) {}

  list(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async create(dto: CreateUnitDto, actorId: number) {
    if (await this.repo.findByAbreviatura(dto.abreviatura))
      throw new BadRequestException(`Abreviatura "${dto.abreviatura}" ya está en uso.`);
    if (await this.repo.findByNombre(dto.nombre))
      throw new BadRequestException(`Nombre "${dto.nombre}" ya está en uso.`);
    const created = await this.repo.create(dto);
    this.events.emit(DomainEvent.CatalogoMaestroCreado, {
      idUsuario: actorId,
      accion: 'unidad.creada',
      entidad: 'unidad_medida',
      entidadId: String(created.idUnidad),
      valorDespues: created,
    });
    return created;
  }

  async update(id: number, dto: UpdateUnitDto, actorId: number) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Unidad no encontrada');
    if (dto.abreviatura && dto.abreviatura !== existing.abreviatura) {
      if (await this.repo.findByAbreviatura(dto.abreviatura))
        throw new BadRequestException('Abreviatura ya en uso.');
    }
    if (dto.nombre && dto.nombre !== existing.nombre) {
      if (await this.repo.findByNombre(dto.nombre))
        throw new BadRequestException('Nombre ya en uso.');
    }
    const updated = await this.repo.update(id, dto);
    this.events.emit(DomainEvent.CatalogoMaestroEditado, {
      idUsuario: actorId,
      accion: 'unidad.editada',
      entidad: 'unidad_medida',
      entidadId: String(id),
      valorAntes: existing,
      valorDespues: updated,
    });
    return updated;
  }
}
