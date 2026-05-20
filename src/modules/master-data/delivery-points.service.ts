import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../common/events/domain-events';
import { DeliveryPointsRepository } from './delivery-points.repository';
import { CreateDeliveryPointDto, UpdateDeliveryPointDto } from './dto/master-data.dto';

@Injectable()
export class DeliveryPointsService {
  constructor(
    private readonly repo: DeliveryPointsRepository,
    private readonly events: EventEmitter2,
  ) {}

  list(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async create(dto: CreateDeliveryPointDto, actorId: number) {
    if (await this.repo.findByNombre(dto.nombre))
      throw new BadRequestException(`Ya existe un punto de entrega con nombre "${dto.nombre}".`);
    const created = await this.repo.create(dto);
    this.events.emit(DomainEvent.CatalogoMaestroCreado, {
      idUsuario: actorId,
      accion: 'punto_entrega.creado',
      entidad: 'punto_entrega',
      entidadId: String(created.idPuntoEntrega),
      valorDespues: created,
    });
    return created;
  }

  async update(id: number, dto: UpdateDeliveryPointDto, actorId: number) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Punto de entrega no encontrado');
    if (dto.nombre && dto.nombre !== existing.nombre) {
      if (await this.repo.findByNombre(dto.nombre))
        throw new BadRequestException('Nombre ya en uso.');
    }
    const updated = await this.repo.update(id, dto);
    this.events.emit(DomainEvent.CatalogoMaestroEditado, {
      idUsuario: actorId,
      accion: 'punto_entrega.editado',
      entidad: 'punto_entrega',
      entidadId: String(id),
      valorAntes: existing,
      valorDespues: updated,
    });
    return updated;
  }
}
