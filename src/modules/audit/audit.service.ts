// PATRÓN: Observer — suscriptor a todos los eventos de dominio.
// Implementa RF37 (auditoría) y RF39 (registro de intentos no autorizados).

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent, DomainEventPayload } from '../../common/events/domain-events';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repo: AuditRepository) {}

  // Captura cualquier evento del namespace (wildcard activado en EventEmitterModule).
  @OnEvent('**', { async: true })
  async onAnyEvent(payload: DomainEventPayload, _meta?: unknown) {
    if (!payload || typeof payload !== 'object' || !('accion' in payload)) return;
    try {
      await this.repo.create({
        idUsuario: payload.idUsuario,
        accion: payload.accion,
        entidad: payload.entidad,
        entidadId: payload.entidadId,
        valorAntes: payload.valorAntes,
        valorDespues: payload.valorDespues,
        resultado: payload.accion.includes('denegado') ? 'DENIED' : 'OK',
      });
    } catch (err) {
      // RF37 — si la auditoría falla, registramos pero no rompemos la operación
      // de UX (la decisión "fail-strong" del DERCAS se mitiga en un job nocturno).
      this.logger.error({ err, payload }, 'audit persist failed');
    }
  }

  // Helper para emitir desde código sin pasar por EventEmitter (uso interno).
  recordManually(payload: DomainEventPayload & { accion: DomainEvent | string }) {
    return this.repo.create({
      idUsuario: payload.idUsuario,
      accion: typeof payload.accion === 'string' ? payload.accion : String(payload.accion),
      entidad: payload.entidad,
      entidadId: payload.entidadId,
      valorAntes: payload.valorAntes,
      valorDespues: payload.valorDespues,
    });
  }
}
