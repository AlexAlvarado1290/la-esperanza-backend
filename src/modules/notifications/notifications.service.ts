// PATRÓN: Observer — reacciona a los eventos de dominio para crear notificaciones.
// PATRÓN: Strategy — delega el envío al canal correspondiente (in-app o SMS).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TipoNotificacion } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEvent } from '../../common/events/domain-events';
import {
  NotificationChannelStrategy,
  NOTIFICATION_STRATEGIES,
} from './notification-channel.strategy';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_STRATEGIES)
    private readonly strategies: NotificationChannelStrategy[],
  ) {}

  async notify(
    idUsuario: number,
    tipo: TipoNotificacion,
    titulo: string,
    mensaje: string,
    payload?: Record<string, unknown>,
  ) {
    // 1. Persistir in-app siempre (RF38).
    await this.repo.create({
      idUsuario,
      tipo,
      titulo,
      mensaje,
      payload: payload as any,
    });

    // 2. Despachar SMS sólo si alguna estrategia SMS soporta el tipo.
    const user = await this.prisma.usuario.findUnique({ where: { idUsuario } });
    if (!user) return;
    for (const strategy of this.strategies) {
      if (strategy.channel === 'sms' && strategy.supports(tipo)) {
        try {
          await strategy.send(
            { idUsuario: user.idUsuario, telefono: user.telefono },
            { tipo, titulo, mensaje, payload },
          );
        } catch (err) {
          this.logger.error({ err }, 'sms notify failed');
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Suscripciones a eventos de dominio (DERCAS RF38).
  // -------------------------------------------------------------------------

  @OnEvent(DomainEvent.SolicitudCreada, { async: true })
  async onSolicitudCreada(p: any) {
    if (!p?.metadata?.idProductor) return;
    await this.notify(
      p.metadata.idProductor,
      TipoNotificacion.SOLICITUD_RECIBIDA,
      'Nueva solicitud de compra',
      `Recibiste una solicitud por ${p.metadata.cantidad} ${p.metadata.unidad ?? 'unidades'} de ${p.metadata.producto ?? 'tu producto'}.`,
      { idSolicitud: p.entidadId },
    );
  }

  @OnEvent(DomainEvent.SolicitudRechazada, { async: true })
  async onSolicitudRechazada(p: any) {
    if (!p?.metadata?.idComprador) return;
    await this.notify(
      p.metadata.idComprador,
      TipoNotificacion.SOLICITUD_RECHAZADA,
      'Tu solicitud fue rechazada',
      p.metadata.motivo ?? 'El productor rechazó tu solicitud.',
      { idSolicitud: p.entidadId },
    );
  }

  @OnEvent(DomainEvent.SolicitudAceptada, { async: true })
  async onSolicitudAceptada(p: any) {
    if (!p?.metadata?.idComprador) return;
    await this.notify(
      p.metadata.idComprador,
      TipoNotificacion.ACUERDO_ACEPTADO,
      '¡Tu solicitud fue aceptada!',
      `El productor formalizó el acuerdo. Fecha programada: ${p.metadata.fechaProgramada ?? 'por definir'}.`,
      { idAcuerdo: p.entidadId },
    );
  }

  @OnEvent(DomainEvent.AcuerdoTransicion, { async: true })
  async onAcuerdoTransicion(p: any) {
    const destino = p?.metadata?.idDestinatario;
    if (!destino) return;
    await this.notify(
      destino,
      TipoNotificacion.ACUERDO_TRANSICION,
      'Actualización del acuerdo',
      `El acuerdo pasó a estado "${p.metadata.estado}".`,
      { idAcuerdo: p.entidadId },
    );
  }

  @OnEvent(DomainEvent.AcuerdoCancelado, { async: true })
  async onAcuerdoCancelado(p: any) {
    const destinos: number[] = p?.metadata?.destinatarios ?? [];
    for (const d of destinos) {
      await this.notify(
        d,
        TipoNotificacion.ACUERDO_CANCELADO,
        'Acuerdo cancelado',
        p.metadata.motivo ?? 'El acuerdo fue cancelado.',
        { idAcuerdo: p.entidadId },
      );
    }
  }

  @OnEvent(DomainEvent.AcuerdoConfirmado, { async: true })
  async onAcuerdoConfirmado(p: any) {
    const destinos: number[] = p?.metadata?.destinatarios ?? [];
    for (const d of destinos) {
      await this.notify(
        d,
        TipoNotificacion.ENTREGA_CONFIRMADA,
        'Entrega confirmada',
        'El comprador confirmó la recepción del producto.',
        { idAcuerdo: p.entidadId },
      );
    }
  }

  @OnEvent(DomainEvent.AcuerdoMensajeEnviado, { async: true })
  async onMensaje(p: any) {
    const dest = p?.metadata?.idDestinatario;
    if (!dest) return;
    await this.notify(
      dest,
      TipoNotificacion.MENSAJE_NUEVO,
      'Nuevo mensaje en tu acuerdo',
      p.metadata.preview ?? 'Tienes un mensaje sin leer.',
      { idAcuerdo: p.entidadId },
    );
  }

  @OnEvent(DomainEvent.IncidenciaReportada, { async: true })
  async onIncidenciaReportada(p: any) {
    const destinos: number[] = p?.metadata?.destinatarios ?? [];
    for (const d of destinos) {
      await this.notify(
        d,
        TipoNotificacion.INCIDENCIA_REPORTADA,
        'Nueva incidencia reportada',
        `Tipo: ${p.metadata.tipo}.`,
        { idReporte: p.entidadId },
      );
    }
  }

  @OnEvent(DomainEvent.IncidenciaResuelta, { async: true })
  async onIncidenciaResuelta(p: any) {
    const destinos: number[] = p?.metadata?.destinatarios ?? [];
    for (const d of destinos) {
      await this.notify(
        d,
        TipoNotificacion.INCIDENCIA_RESUELTA,
        'Incidencia actualizada',
        `Estado: ${p.metadata.estado}.`,
        { idReporte: p.entidadId },
      );
    }
  }

  @OnEvent(DomainEvent.UsuarioCreado, { async: true })
  async onUsuarioCreado(p: any) {
    if (!p?.metadata?.idUsuario) return;
    await this.notify(
      p.metadata.idUsuario,
      TipoNotificacion.ALTA_USUARIO,
      'Bienvenido a La Esperanza',
      'Tu cuenta fue creada. Tu PIN inicial fue enviado al teléfono registrado.',
      {},
    );
  }

  @OnEvent(DomainEvent.UsuarioPinReiniciado, { async: true })
  async onPinReiniciado(p: any) {
    if (!p?.metadata?.idUsuario) return;
    await this.notify(
      p.metadata.idUsuario,
      TipoNotificacion.PIN_REINICIADO,
      'PIN reiniciado',
      'Tu PIN fue reiniciado por la Asociación. Deberás cambiarlo en tu próximo inicio de sesión.',
      {},
    );
  }

  @OnEvent(DomainEvent.UsuarioEstadoCambiado, { async: true })
  async onEstadoCambiado(p: any) {
    if (!p?.metadata?.idUsuario) return;
    await this.notify(
      p.metadata.idUsuario,
      TipoNotificacion.CUENTA_ESTADO_CAMBIADO,
      'Estado de tu cuenta',
      `Tu cuenta pasó a estado "${p.metadata.estado}".`,
      {},
    );
  }
}
