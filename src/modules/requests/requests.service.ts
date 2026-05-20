import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EstadoCuenta,
  EstadoProducto,
  EstadoSolicitud,
  NombreRol,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEvent } from '../../common/events/domain-events';
import { CreateRequestDto, RejectRequestDto } from './dto/requests.dto';
import { RequestsRepository } from './requests.repository';

@Injectable()
export class RequestsService {
  constructor(
    private readonly repo: RequestsRepository,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  listMine(actor: { sub: number; rol: NombreRol }, estado?: EstadoSolicitud) {
    if (actor.rol === NombreRol.COMPRADOR) return this.repo.findByComprador(actor.sub, estado);
    if (actor.rol === NombreRol.PRODUCTOR) return this.repo.findByProductor(actor.sub, estado);
    // ADMIN: usar /requests sin filtro de usuario.
    return this.prisma.solicitudCompra.findMany({
      where: { ...(estado ? { estadoSolicitud: estado } : {}) },
      include: { producto: true, comprador: true, acuerdo: true },
      orderBy: { fechaSolicitud: 'desc' },
    });
  }

  // RF13.
  async create(dto: CreateRequestDto, comprador: { sub: number; rol: NombreRol; estadoCuenta: EstadoCuenta }) {
    if (comprador.estadoCuenta !== EstadoCuenta.ACTIVO) {
      throw new ForbiddenException('Tu cuenta no está activa. Contacta a la Asociación.');
    }
    const producto = await this.prisma.producto.findUnique({
      where: { idProducto: dto.idProducto },
      include: { productor: true, unidad: true },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (producto.estadoProducto === EstadoProducto.RETIRADO) {
      throw new BadRequestException('Producto retirado del catálogo.');
    }
    if (producto.productor.estadoCuenta !== EstadoCuenta.ACTIVO) {
      throw new BadRequestException('El productor no está activo.');
    }
    if (Number(producto.cantidadDisponible) < dto.cantidadSolicitada) {
      throw new BadRequestException(
        `Cantidad solicitada (${dto.cantidadSolicitada}) supera la disponible (${producto.cantidadDisponible}).`,
      );
    }

    const created = await this.repo.create({
      cantidadSolicitada: new Prisma.Decimal(dto.cantidadSolicitada),
      mensajeInicial: dto.mensajeInicial ?? null,
      comprador: { connect: { idUsuario: comprador.sub } },
      producto: { connect: { idProducto: dto.idProducto } },
    });

    this.events.emit(DomainEvent.SolicitudCreada, {
      idUsuario: comprador.sub,
      accion: 'solicitud.creada',
      entidad: 'solicitud_compra',
      entidadId: String(created.idSolicitud),
      valorDespues: created,
      metadata: {
        idProductor: producto.idProductor,
        cantidad: dto.cantidadSolicitada,
        producto: producto.nombre,
        unidad: producto.unidad.abreviatura,
      },
    });
    return created;
  }

  // RF16 — Rechazar solicitud (sólo productor dueño o admin).
  async reject(id: number, dto: RejectRequestDto, actor: { sub: number; rol: NombreRol }) {
    const sol = await this.repo.findById(id);
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.estadoSolicitud !== EstadoSolicitud.SOLICITADO) {
      throw new BadRequestException('Solicitud ya respondida.');
    }
    if (sol.producto.idProductor !== actor.sub && actor.rol !== NombreRol.ADMIN) {
      throw new ForbiddenException('Sólo el productor puede rechazar esta solicitud.');
    }
    const updated = await this.repo.update(id, {
      estadoSolicitud: EstadoSolicitud.RECHAZADA,
      motivoRechazo: dto.motivo,
    });
    this.events.emit(DomainEvent.SolicitudRechazada, {
      idUsuario: actor.sub,
      accion: 'solicitud.rechazada',
      entidad: 'solicitud_compra',
      entidadId: String(id),
      valorAntes: sol,
      valorDespues: updated,
      metadata: { idComprador: sol.idComprador, motivo: dto.motivo },
    });
    return updated;
  }

  // RF20 — Cancelar solicitud propia (comprador, antes de aceptar).
  async cancelByBuyer(id: number, comprador: { sub: number }, motivo: string) {
    const sol = await this.repo.findById(id);
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.idComprador !== comprador.sub)
      throw new ForbiddenException('Sólo el comprador autor puede cancelar.');
    if (sol.estadoSolicitud !== EstadoSolicitud.SOLICITADO) {
      throw new BadRequestException('Sólo puedes cancelar solicitudes aún no aceptadas.');
    }
    const updated = await this.repo.update(id, {
      estadoSolicitud: EstadoSolicitud.CANCELADA,
      motivoRechazo: motivo,
    });
    this.events.emit(DomainEvent.SolicitudRechazada, {
      idUsuario: comprador.sub,
      accion: 'solicitud.cancelada_por_comprador',
      entidad: 'solicitud_compra',
      entidadId: String(id),
      metadata: { idComprador: sol.idComprador, motivo },
    });
    return updated;
  }
}
