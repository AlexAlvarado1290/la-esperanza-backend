// PATRÓN: State — la máquina de estados encapsula las transiciones válidas
// del Acuerdo Comercial conforme al diagrama 5.13 del DERCAS (RNF27).
// Cada transición declara el rol autorizado y si requiere observaciones.

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EstadoAcuerdo, NombreRol } from '@prisma/client';

export type TransitionActor = NombreRol | 'COMPRADOR_O_PRODUCTOR' | 'PARTES_O_ADMIN';

export interface Transition {
  from: EstadoAcuerdo;
  to: EstadoAcuerdo;
  actor: TransitionActor;
  requiresMotivo?: boolean;
}

// Tabla completa de transiciones permitidas (diagrama 5.13).
export const TRANSITIONS: Transition[] = [
  // El estado SOLICITADO sólo es válido como punto inicial (la solicitud
  // todavía no es Acuerdo). Las transiciones desde SOLICITADO se manejan en
  // el módulo de Requests (aceptar/rechazar) y crean/no crean el Acuerdo.
  { from: EstadoAcuerdo.SOLICITADO, to: EstadoAcuerdo.ACEPTADO, actor: NombreRol.PRODUCTOR },
  { from: EstadoAcuerdo.SOLICITADO, to: EstadoAcuerdo.CANCELADO, actor: 'COMPRADOR_O_PRODUCTOR', requiresMotivo: true },

  { from: EstadoAcuerdo.ACEPTADO, to: EstadoAcuerdo.PREPARANDO, actor: NombreRol.PRODUCTOR },
  { from: EstadoAcuerdo.ACEPTADO, to: EstadoAcuerdo.CANCELADO, actor: 'PARTES_O_ADMIN', requiresMotivo: true },

  { from: EstadoAcuerdo.PREPARANDO, to: EstadoAcuerdo.PROGRAMADO, actor: NombreRol.PRODUCTOR },
  { from: EstadoAcuerdo.PREPARANDO, to: EstadoAcuerdo.CANCELADO, actor: 'PARTES_O_ADMIN', requiresMotivo: true },

  { from: EstadoAcuerdo.PROGRAMADO, to: EstadoAcuerdo.EN_RUTA, actor: NombreRol.PRODUCTOR },
  { from: EstadoAcuerdo.PROGRAMADO, to: EstadoAcuerdo.CANCELADO, actor: 'PARTES_O_ADMIN', requiresMotivo: true },

  { from: EstadoAcuerdo.EN_RUTA, to: EstadoAcuerdo.ENTREGADO_PRODUCTOR, actor: NombreRol.PRODUCTOR },
  { from: EstadoAcuerdo.EN_RUTA, to: EstadoAcuerdo.CANCELADO, actor: NombreRol.ADMIN, requiresMotivo: true },

  { from: EstadoAcuerdo.ENTREGADO_PRODUCTOR, to: EstadoAcuerdo.CONFIRMADO_COMPRADOR, actor: NombreRol.COMPRADOR },
  { from: EstadoAcuerdo.ENTREGADO_PRODUCTOR, to: EstadoAcuerdo.INCIDENCIA, actor: 'COMPRADOR_O_PRODUCTOR', requiresMotivo: true },
  { from: EstadoAcuerdo.ENTREGADO_PRODUCTOR, to: EstadoAcuerdo.INCUMPLIDA_POR_TIEMPO, actor: NombreRol.ADMIN, requiresMotivo: true },

  { from: EstadoAcuerdo.INCIDENCIA, to: EstadoAcuerdo.RESUELTA_CONFIRMADA, actor: NombreRol.ADMIN, requiresMotivo: true },
  { from: EstadoAcuerdo.INCIDENCIA, to: EstadoAcuerdo.RESUELTA_DESCARTADA, actor: NombreRol.ADMIN, requiresMotivo: true },

  // El descarte de la incidencia vuelve el acuerdo al flujo normal.
  { from: EstadoAcuerdo.RESUELTA_DESCARTADA, to: EstadoAcuerdo.CONFIRMADO_COMPRADOR, actor: NombreRol.ADMIN },
];

export const TERMINAL_STATES: ReadonlySet<EstadoAcuerdo> = new Set([
  EstadoAcuerdo.CONFIRMADO_COMPRADOR,
  EstadoAcuerdo.CANCELADO,
  EstadoAcuerdo.INCUMPLIDA_POR_TIEMPO,
  EstadoAcuerdo.RESUELTA_CONFIRMADA,
]);

export class AgreementStateMachine {
  /** Lista los estados a los que se puede transitar desde `from`. */
  static allowedNext(from: EstadoAcuerdo): EstadoAcuerdo[] {
    return TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
  }

  static isTerminal(state: EstadoAcuerdo): boolean {
    return TERMINAL_STATES.has(state);
  }

  /** Devuelve la transición exacta o lanza si no existe. */
  static find(from: EstadoAcuerdo, to: EstadoAcuerdo): Transition {
    const t = TRANSITIONS.find((x) => x.from === from && x.to === to);
    if (!t) {
      throw new BadRequestException(
        `Transición no válida: ${from} → ${to}. Permitidas: ${AgreementStateMachine.allowedNext(from).join(', ') || '(estado terminal)'}.`,
      );
    }
    return t;
  }

  /**
   * Verifica que la transición sea válida y que `actor` esté autorizado.
   * `partes` es el conjunto de usuarios involucrados (comprador, productor).
   */
  static assertTransition(
    from: EstadoAcuerdo,
    to: EstadoAcuerdo,
    actor: { id: number; rol: NombreRol },
    partes: { idComprador: number; idProductor: number },
    motivo?: string,
  ): Transition {
    if (this.isTerminal(from)) {
      throw new BadRequestException(`El acuerdo está en estado terminal (${from}).`);
    }
    const t = this.find(from, to);

    const isComprador = actor.id === partes.idComprador && actor.rol === NombreRol.COMPRADOR;
    const isProductor = actor.id === partes.idProductor && actor.rol === NombreRol.PRODUCTOR;
    const isAdmin = actor.rol === NombreRol.ADMIN;

    let allowed = false;
    switch (t.actor) {
      case NombreRol.ADMIN:
        allowed = isAdmin;
        break;
      case NombreRol.PRODUCTOR:
        allowed = isProductor || isAdmin;
        break;
      case NombreRol.COMPRADOR:
        allowed = isComprador || isAdmin;
        break;
      case 'COMPRADOR_O_PRODUCTOR':
        allowed = isComprador || isProductor || isAdmin;
        break;
      case 'PARTES_O_ADMIN':
        allowed = isComprador || isProductor || isAdmin;
        break;
    }
    if (!allowed) {
      throw new ForbiddenException(
        `Tu rol (${actor.rol}) no puede ejecutar la transición ${from} → ${to}.`,
      );
    }
    if (t.requiresMotivo && !motivo?.trim()) {
      throw new BadRequestException('La transición requiere un comentario o motivo.');
    }
    return t;
  }

  /** Calcula `estado_final` cuando se cierra el ciclo. */
  static computeEstadoFinal(state: EstadoAcuerdo):
    | 'CONFIRMADA'
    | 'INCUMPLIDA'
    | 'CANCELADA'
    | null {
    if (state === EstadoAcuerdo.CONFIRMADO_COMPRADOR) return 'CONFIRMADA';
    if (state === EstadoAcuerdo.CANCELADO) return 'CANCELADA';
    if (state === EstadoAcuerdo.INCUMPLIDA_POR_TIEMPO) return 'INCUMPLIDA';
    if (state === EstadoAcuerdo.RESUELTA_CONFIRMADA) return 'INCUMPLIDA';
    return null;
  }
}
