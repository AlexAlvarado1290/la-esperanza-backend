// RF21 — Mensajería dentro del acuerdo.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoAcuerdo, NombreRol } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DomainEvent } from '../../../common/events/domain-events';
import { AgreementsService } from '../agreements.service';
import { AgreementsRepository } from '../agreements.repository';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AgreementsRepository,
    private readonly agreements: AgreementsService,
    private readonly events: EventEmitter2,
  ) {}

  async list(idAcuerdo: number, actor: { sub: number; rol: NombreRol }) {
    const acuerdo = await this.repo.findById(idAcuerdo);
    if (!acuerdo) throw new NotFoundException('Acuerdo no encontrado');
    this.agreements.assertParte(acuerdo, actor);
    return this.prisma.mensajeAcuerdo.findMany({
      where: { idAcuerdo },
      include: { remitente: { select: { idUsuario: true, nombreCompleto: true } } },
      orderBy: { fechaHora: 'asc' },
    });
  }

  async send(idAcuerdo: number, mensaje: string, actor: { sub: number; rol: NombreRol }) {
    if (!mensaje?.trim()) throw new BadRequestException('Mensaje vacío');
    const acuerdo = await this.repo.findById(idAcuerdo);
    if (!acuerdo) throw new NotFoundException('Acuerdo no encontrado');
    this.agreements.assertParte(acuerdo, actor);
    if (acuerdo.estadoAcuerdo === EstadoAcuerdo.CANCELADO) {
      throw new BadRequestException('Acuerdo cancelado: chat en modo sólo lectura.');
    }
    const created = await this.prisma.mensajeAcuerdo.create({
      data: { idAcuerdo, idRemitente: actor.sub, mensaje: mensaje.trim() },
    });

    const partes = this.agreements.getPartes(acuerdo);
    const destinatario = actor.sub === partes.idComprador ? partes.idProductor : partes.idComprador;
    this.events.emit(DomainEvent.AcuerdoMensajeEnviado, {
      idUsuario: actor.sub,
      accion: 'acuerdo.mensaje',
      entidad: 'acuerdo_comercial',
      entidadId: String(idAcuerdo),
      metadata: {
        idDestinatario: destinatario,
        preview: mensaje.slice(0, 80),
      },
    });
    return created;
  }
}
