// PATRÓN: State — usa AgreementStateMachine para validar transiciones (5.13).
// PATRÓN: Repository — todas las consultas pasan por *.repository.ts.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EstadoAcuerdo,
  EstadoFinal,
  EstadoMaestro,
  EstadoProducto,
  EstadoSolicitud,
  NombreRol,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEvent } from '../../common/events/domain-events';
import { AgreementsRepository } from './agreements.repository';
import { AgreementStateMachine } from './state-machine';
import { AcceptRequestDto, CancelDto, TransitionDto, UpdatePagoDto } from './dto/agreements.dto';

interface Actor {
  sub: number;
  rol: NombreRol;
}

@Injectable()
export class AgreementsService {
  constructor(
    private readonly repo: AgreementsRepository,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  list(actor: Actor, estado?: EstadoAcuerdo) {
    return this.repo.list(actor, estado);
  }

  async findOne(id: number, actor: Actor) {
    const acuerdo = await this.repo.findById(id);
    if (!acuerdo) throw new NotFoundException('Acuerdo no encontrado');
    this.assertParte(acuerdo, actor);
    return acuerdo;
  }

  // RF15 — Aceptar solicitud y registrar acuerdo (UC15+UC16).
  // Reserva la cantidad del stock del productor (RF15).
  async acceptRequest(idSolicitud: number, dto: AcceptRequestDto, productor: Actor) {
    const sol = await this.prisma.solicitudCompra.findUnique({
      where: { idSolicitud },
      include: { producto: { include: { productor: true } }, comprador: true, acuerdo: true },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.estadoSolicitud !== EstadoSolicitud.SOLICITADO) {
      throw new BadRequestException('Solicitud ya respondida.');
    }
    if (sol.producto.idProductor !== productor.sub && productor.rol !== NombreRol.ADMIN) {
      throw new ForbiddenException('Sólo el productor puede aceptar esta solicitud.');
    }

    const punto = await this.prisma.puntoEntrega.findUnique({
      where: { idPuntoEntrega: dto.idPuntoEntrega },
    });
    if (!punto || punto.estado === EstadoMaestro.INACTIVO) {
      throw new BadRequestException('Punto de entrega inválido o inactivo.');
    }
    const fechaProgramada = new Date(dto.fechaProgramada);
    if (Number.isNaN(fechaProgramada.getTime()) || fechaProgramada.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('Fecha programada debe ser válida y no estar en el pasado.');
    }

    const cantidad = Number(sol.cantidadSolicitada);
    if (Number(sol.producto.cantidadDisponible) < cantidad) {
      throw new BadRequestException('Stock insuficiente para reservar la cantidad solicitada.');
    }

    // Transacción atómica: actualiza solicitud, crea acuerdo, reserva stock,
    // y registra el seguimiento inicial (RF15 + RF36).
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.solicitudCompra.update({
        where: { idSolicitud },
        data: { estadoSolicitud: EstadoSolicitud.ACEPTADA },
      });
      const nuevoStock = Number(sol.producto.cantidadDisponible) - cantidad;
      await tx.producto.update({
        where: { idProducto: sol.idProducto },
        data: {
          cantidadDisponible: new Prisma.Decimal(nuevoStock),
          estadoProducto:
            nuevoStock <= 0 ? EstadoProducto.AGOTADO : EstadoProducto.DISPONIBLE,
        },
      });
      const acuerdo = await tx.acuerdoComercial.create({
        data: {
          idSolicitud,
          idPuntoEntrega: dto.idPuntoEntrega,
          precioFinal: new Prisma.Decimal(dto.precioFinal),
          cantidadAcordada: new Prisma.Decimal(cantidad),
          fechaProgramada,
          estadoAcuerdo: EstadoAcuerdo.ACEPTADO,
          observaciones: dto.observaciones ?? null,
        },
      });
      await tx.seguimientoEntrega.create({
        data: {
          idAcuerdo: acuerdo.idAcuerdo,
          idUsuario: productor.sub,
          estado: EstadoAcuerdo.ACEPTADO,
          comentario: dto.observaciones ?? 'Acuerdo aceptado y programado.',
        },
      });
      return acuerdo;
    });

    this.events.emit(DomainEvent.SolicitudAceptada, {
      idUsuario: productor.sub,
      accion: 'acuerdo.creado',
      entidad: 'acuerdo_comercial',
      entidadId: String(result.idAcuerdo),
      valorDespues: result,
      metadata: {
        idComprador: sol.idComprador,
        idProductor: sol.producto.idProductor,
        fechaProgramada: result.fechaProgramada.toISOString(),
      },
    });

    return this.repo.findById(result.idAcuerdo);
  }

  // RF17 — Avanzar estado del acuerdo.
  async transition(id: number, dto: TransitionDto, actor: Actor) {
    const acuerdo = await this.requireAcuerdo(id);
    this.assertParte(acuerdo, actor);
    const partes = this.getPartes(acuerdo);
    AgreementStateMachine.assertTransition(
      acuerdo.estadoAcuerdo,
      dto.estado,
      { id: actor.sub, rol: actor.rol },
      partes,
      dto.comentario,
    );

    // RF18 — al marcar ENTREGADO_PRODUCTOR registramos fecha.
    const updates: Prisma.AcuerdoComercialUpdateInput = { estadoAcuerdo: dto.estado };
    if (dto.estado === EstadoAcuerdo.ENTREGADO_PRODUCTOR) {
      updates.fechaEntregaProductor = new Date();
    }
    if (dto.estado === EstadoAcuerdo.CONFIRMADO_COMPRADOR) {
      updates.fechaConfirmacionComprador = new Date();
    }
    const estadoFinal = AgreementStateMachine.computeEstadoFinal(dto.estado);
    if (estadoFinal) {
      updates.estadoFinal = estadoFinal as EstadoFinal;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const acu = await tx.acuerdoComercial.update({ where: { idAcuerdo: id }, data: updates });
      await tx.seguimientoEntrega.create({
        data: {
          idAcuerdo: id,
          idUsuario: actor.sub,
          estado: dto.estado,
          comentario: dto.comentario ?? null,
        },
      });
      return acu;
    });

    const destinatario =
      actor.rol === NombreRol.COMPRADOR ? partes.idProductor : partes.idComprador;

    if (dto.estado === EstadoAcuerdo.CONFIRMADO_COMPRADOR) {
      this.events.emit(DomainEvent.AcuerdoConfirmado, {
        idUsuario: actor.sub,
        accion: 'acuerdo.confirmado',
        entidad: 'acuerdo_comercial',
        entidadId: String(id),
        metadata: { destinatarios: [partes.idProductor] },
      });
    } else {
      this.events.emit(DomainEvent.AcuerdoTransicion, {
        idUsuario: actor.sub,
        accion: `acuerdo.transicion.${dto.estado.toLowerCase()}`,
        entidad: 'acuerdo_comercial',
        entidadId: String(id),
        valorAntes: { estado: acuerdo.estadoAcuerdo },
        valorDespues: { estado: dto.estado },
        metadata: { idDestinatario: destinatario, estado: dto.estado },
      });
    }

    return this.repo.findById(updated.idAcuerdo);
  }

  // RF20 — Cancelar acuerdo y liberar stock (si no es terminal).
  async cancel(id: number, dto: CancelDto, actor: Actor) {
    const acuerdo = await this.requireAcuerdo(id);
    this.assertParte(acuerdo, actor);
    const partes = this.getPartes(acuerdo);
    AgreementStateMachine.assertTransition(
      acuerdo.estadoAcuerdo,
      EstadoAcuerdo.CANCELADO,
      { id: actor.sub, rol: actor.rol },
      partes,
      dto.motivo,
    );

    // Si todavía no se entregó, liberar stock al inventario del productor.
    const debeLiberar = !this.fueEntregado(acuerdo.estadoAcuerdo);

    const updated = await this.prisma.$transaction(async (tx) => {
      const acu = await tx.acuerdoComercial.update({
        where: { idAcuerdo: id },
        data: {
          estadoAcuerdo: EstadoAcuerdo.CANCELADO,
          estadoFinal: EstadoFinal.CANCELADA,
          justificacionIncumplimiento: dto.motivo,
        },
      });
      await tx.seguimientoEntrega.create({
        data: {
          idAcuerdo: id,
          idUsuario: actor.sub,
          estado: EstadoAcuerdo.CANCELADO,
          comentario: `[${actor.rol}] ${dto.motivo}`,
        },
      });
      if (debeLiberar) {
        const producto = await tx.producto.findUnique({
          where: { idProducto: acuerdo.solicitud.idProducto },
        });
        if (producto) {
          const restored =
            Number(producto.cantidadDisponible) + Number(acuerdo.cantidadAcordada);
          await tx.producto.update({
            where: { idProducto: producto.idProducto },
            data: {
              cantidadDisponible: new Prisma.Decimal(restored),
              estadoProducto:
                restored > 0 ? EstadoProducto.DISPONIBLE : EstadoProducto.AGOTADO,
            },
          });
        }
      }
      return acu;
    });

    this.events.emit(DomainEvent.AcuerdoCancelado, {
      idUsuario: actor.sub,
      accion: 'acuerdo.cancelado',
      entidad: 'acuerdo_comercial',
      entidadId: String(id),
      metadata: {
        destinatarios: [partes.idComprador, partes.idProductor].filter((x) => x !== actor.sub),
        motivo: dto.motivo,
      },
    });

    return updated;
  }

  // RF19 — Registrar estado de pago.
  async updatePago(id: number, dto: UpdatePagoDto, actor: Actor) {
    const acuerdo = await this.requireAcuerdo(id);
    this.assertParte(acuerdo, actor);
    if (acuerdo.estadoAcuerdo === EstadoAcuerdo.CANCELADO) {
      throw new BadRequestException('Acuerdo cancelado: no se permite modificar el estado de pago.');
    }
    if (actor.rol === NombreRol.COMPRADOR) {
      throw new ForbiddenException('Sólo el productor o el admin registran el estado de pago.');
    }
    const updated = await this.prisma.acuerdoComercial.update({
      where: { idAcuerdo: id },
      data: { estadoPago: dto.estadoPago },
    });
    this.events.emit(DomainEvent.AcuerdoPagoActualizado, {
      idUsuario: actor.sub,
      accion: 'acuerdo.pago',
      entidad: 'acuerdo_comercial',
      entidadId: String(id),
      valorAntes: { estadoPago: acuerdo.estadoPago },
      valorDespues: { estadoPago: dto.estadoPago },
    });
    return updated;
  }

  // ----------------------------- Helpers -----------------------------------

  private async requireAcuerdo(id: number) {
    const acuerdo = await this.repo.findById(id);
    if (!acuerdo) throw new NotFoundException('Acuerdo no encontrado');
    return acuerdo;
  }

  /** Lanza si el actor no es parte del acuerdo (y no es admin). */
  assertParte(
    acuerdo: { solicitud: { idComprador: number; producto: { idProductor: number } } },
    actor: Actor,
  ) {
    if (actor.rol === NombreRol.ADMIN) return;
    if (
      actor.sub === acuerdo.solicitud.idComprador ||
      actor.sub === acuerdo.solicitud.producto.idProductor
    ) {
      return;
    }
    throw new ForbiddenException('No formas parte de este acuerdo.');
  }

  getPartes(acuerdo: { solicitud: { idComprador: number; producto: { idProductor: number } } }) {
    return {
      idComprador: acuerdo.solicitud.idComprador,
      idProductor: acuerdo.solicitud.producto.idProductor,
    };
  }

  private fueEntregado(estado: EstadoAcuerdo): boolean {
    const entregados: EstadoAcuerdo[] = [
      EstadoAcuerdo.ENTREGADO_PRODUCTOR,
      EstadoAcuerdo.CONFIRMADO_COMPRADOR,
      EstadoAcuerdo.INCIDENCIA,
      EstadoAcuerdo.RESUELTA_CONFIRMADA,
      EstadoAcuerdo.RESUELTA_DESCARTADA,
      EstadoAcuerdo.INCUMPLIDA_POR_TIEMPO,
    ];
    return entregados.includes(estado);
  }
}
