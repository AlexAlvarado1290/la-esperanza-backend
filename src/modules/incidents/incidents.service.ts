import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoAcuerdo, EstadoReporte, NombreRol } from '@prisma/client';
import { DomainEvent } from '../../common/events/domain-events';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgreementsRepository } from '../agreements/agreements.repository';
import { AgreementsService } from '../agreements/agreements.service';
import { CreateIncidentDto, ResolveIncidentDto } from './dto/incidents.dto';
import { IncidentsRepository } from './incidents.repository';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly repo: IncidentsRepository,
    private readonly prisma: PrismaService,
    private readonly agreementsRepo: AgreementsRepository,
    private readonly agreements: AgreementsService,
    private readonly events: EventEmitter2,
  ) {}

  // RF31.
  async report(idAcuerdo: number, dto: CreateIncidentDto, actor: { sub: number; rol: NombreRol }) {
    const acuerdo = await this.agreementsRepo.findById(idAcuerdo);
    if (!acuerdo) throw new NotFoundException('Acuerdo no encontrado');
    this.agreements.assertParte(acuerdo, actor);

    if (acuerdo.estadoAcuerdo === EstadoAcuerdo.CANCELADO) {
      const treintaDias = 30 * 24 * 3600 * 1000;
      // Si pasaron más de 30 días desde la última entrada de bitácora del acuerdo cancelado.
      const ultimo = acuerdo.seguimientos[acuerdo.seguimientos.length - 1]?.fechaHora;
      if (ultimo && Date.now() - ultimo.getTime() > treintaDias) {
        throw new BadRequestException('No se pueden reportar incidencias en acuerdos cancelados hace más de 30 días.');
      }
    }

    const partes = this.agreements.getPartes(acuerdo);
    const created = await this.prisma.$transaction(async (tx) => {
      const reporte = await tx.reporteIncidencia.create({
        data: {
          idAcuerdo,
          idReportante: actor.sub,
          tipo: dto.tipo,
          descripcion: dto.descripcion,
        },
      });
      // Si todavía no estaba en INCIDENCIA, escalamos el estado del acuerdo
      // sólo cuando ya hubo entrega del productor (diagrama 5.13).
      if (acuerdo.estadoAcuerdo === EstadoAcuerdo.ENTREGADO_PRODUCTOR) {
        await tx.acuerdoComercial.update({
          where: { idAcuerdo },
          data: { estadoAcuerdo: EstadoAcuerdo.INCIDENCIA },
        });
        await tx.seguimientoEntrega.create({
          data: {
            idAcuerdo,
            idUsuario: actor.sub,
            estado: EstadoAcuerdo.INCIDENCIA,
            comentario: `Reporte ${dto.tipo}: ${dto.descripcion.slice(0, 120)}`,
          },
        });
      }
      return reporte;
    });

    this.events.emit(DomainEvent.IncidenciaReportada, {
      idUsuario: actor.sub,
      accion: 'incidencia.reportada',
      entidad: 'reporte_incidencia',
      entidadId: String(created.idReporte),
      valorDespues: created,
      metadata: {
        destinatarios: [partes.idComprador, partes.idProductor].filter((x) => x !== actor.sub),
        tipo: dto.tipo,
      },
    });

    return created;
  }

  // RF32.
  async resolve(id: number, dto: ResolveIncidentDto, actor: { sub: number; rol: NombreRol }) {
    if (actor.rol !== NombreRol.ADMIN) {
      throw new ForbiddenException('Sólo el administrador puede registrar resoluciones.');
    }
    const reporte = await this.repo.findById(id);
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    if (dto.estado === EstadoReporte.RESUELTO && !dto.resolucion?.trim()) {
      throw new BadRequestException('La resolución es obligatoria al marcar como RESUELTO.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rep = await tx.reporteIncidencia.update({
        where: { idReporte: id },
        data: { estadoReporte: dto.estado, resolucion: dto.resolucion ?? null },
      });

      // Si la decisión cierra la incidencia, propagar al acuerdo (diagrama 5.13).
      if (dto.estado === EstadoReporte.RESUELTO) {
        // Decisión a favor del comprador → resuelta_confirmada (incumplida).
        await tx.acuerdoComercial.update({
          where: { idAcuerdo: reporte.idAcuerdo },
          data: {
            estadoAcuerdo: EstadoAcuerdo.RESUELTA_CONFIRMADA,
            estadoFinal: 'INCUMPLIDA',
          },
        });
        await tx.seguimientoEntrega.create({
          data: {
            idAcuerdo: reporte.idAcuerdo,
            idUsuario: actor.sub,
            estado: EstadoAcuerdo.RESUELTA_CONFIRMADA,
            comentario: `Resolución del comité: ${dto.resolucion}`,
          },
        });
      } else if (dto.estado === EstadoReporte.DESCARTADO) {
        // Vuelve al flujo normal → confirmado_comprador.
        await tx.acuerdoComercial.update({
          where: { idAcuerdo: reporte.idAcuerdo },
          data: {
            estadoAcuerdo: EstadoAcuerdo.CONFIRMADO_COMPRADOR,
            estadoFinal: 'CONFIRMADA',
            fechaConfirmacionComprador: new Date(),
          },
        });
        await tx.seguimientoEntrega.create({
          data: {
            idAcuerdo: reporte.idAcuerdo,
            idUsuario: actor.sub,
            estado: EstadoAcuerdo.RESUELTA_DESCARTADA,
            comentario: `Reporte descartado por el comité. ${dto.resolucion ?? ''}`,
          },
        });
      }
      return rep;
    });

    this.events.emit(DomainEvent.IncidenciaResuelta, {
      idUsuario: actor.sub,
      accion: 'incidencia.resuelta',
      entidad: 'reporte_incidencia',
      entidadId: String(id),
      valorDespues: updated,
      metadata: {
        destinatarios: [
          reporte.acuerdo.solicitud.idComprador,
          reporte.acuerdo.solicitud.producto.idProductor,
        ],
        estado: dto.estado,
      },
    });

    return updated;
  }

  list(filters: {
    estado?: EstadoReporte;
    idAcuerdo?: number;
    actor: { sub: number; rol: NombreRol };
  }) {
    if (filters.actor.rol === NombreRol.ADMIN) {
      return this.repo.list({ estado: filters.estado, idAcuerdo: filters.idAcuerdo });
    }
    return this.repo.list({
      estado: filters.estado,
      idAcuerdo: filters.idAcuerdo,
      idReportante: filters.actor.sub,
    });
  }
}
