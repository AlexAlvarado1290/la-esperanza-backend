// Pruebas unitarias del PATRÓN State (AgreementStateMachine).
// Cubre todas las transiciones válidas del diagrama 5.13 del DERCAS y
// las principales transiciones inválidas o no autorizadas (RNF28).

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EstadoAcuerdo, NombreRol } from '@prisma/client';
import { AgreementStateMachine } from './state-machine';

const partes = { idComprador: 100, idProductor: 200 };
const productor = { id: 200, rol: NombreRol.PRODUCTOR };
const comprador = { id: 100, rol: NombreRol.COMPRADOR };
const admin = { id: 999, rol: NombreRol.ADMIN };

describe('AgreementStateMachine — transiciones válidas (diagrama 5.13)', () => {
  it.each([
    [EstadoAcuerdo.SOLICITADO, EstadoAcuerdo.ACEPTADO, productor],
    [EstadoAcuerdo.ACEPTADO, EstadoAcuerdo.PREPARANDO, productor],
    [EstadoAcuerdo.PREPARANDO, EstadoAcuerdo.PROGRAMADO, productor],
    [EstadoAcuerdo.PROGRAMADO, EstadoAcuerdo.EN_RUTA, productor],
    [EstadoAcuerdo.EN_RUTA, EstadoAcuerdo.ENTREGADO_PRODUCTOR, productor],
    [EstadoAcuerdo.ENTREGADO_PRODUCTOR, EstadoAcuerdo.CONFIRMADO_COMPRADOR, comprador],
  ])('permite la transición feliz %s → %s', (from, to, actor) => {
    expect(() =>
      AgreementStateMachine.assertTransition(from, to, actor, partes),
    ).not.toThrow();
  });

  it('permite que el comprador cancele con motivo', () => {
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.ACEPTADO,
        EstadoAcuerdo.CANCELADO,
        comprador,
        partes,
        'motivo válido',
      ),
    ).not.toThrow();
  });

  it('permite que admin fuerce cancelación en EN_RUTA', () => {
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.EN_RUTA,
        EstadoAcuerdo.CANCELADO,
        admin,
        partes,
        'mediación comité',
      ),
    ).not.toThrow();
  });

  it('permite admin marcar INCUMPLIDA_POR_TIEMPO con motivo', () => {
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.ENTREGADO_PRODUCTOR,
        EstadoAcuerdo.INCUMPLIDA_POR_TIEMPO,
        admin,
        partes,
        '7 días sin confirmar',
      ),
    ).not.toThrow();
  });

  it('permite descartar incidencia y volver al flujo normal', () => {
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.INCIDENCIA,
        EstadoAcuerdo.RESUELTA_DESCARTADA,
        admin,
        partes,
        'comité descarta',
      ),
    ).not.toThrow();
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.RESUELTA_DESCARTADA,
        EstadoAcuerdo.CONFIRMADO_COMPRADOR,
        admin,
        partes,
      ),
    ).not.toThrow();
  });
});

describe('AgreementStateMachine — transiciones inválidas', () => {
  it('rechaza saltarse estados (ACEPTADO → EN_RUTA)', () => {
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.ACEPTADO,
        EstadoAcuerdo.EN_RUTA,
        productor,
        partes,
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza avanzar desde un estado terminal', () => {
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.CONFIRMADO_COMPRADOR,
        EstadoAcuerdo.CANCELADO,
        admin,
        partes,
        'motivo',
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza si el actor no es del rol autorizado', () => {
    // comprador intenta avanzar PREPARANDO → PROGRAMADO (sólo productor o admin).
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.PREPARANDO,
        EstadoAcuerdo.PROGRAMADO,
        comprador,
        partes,
      ),
    ).toThrow(ForbiddenException);
  });

  it('rechaza confirmación si el comprador no es el de la solicitud', () => {
    const otroComprador = { id: 555, rol: NombreRol.COMPRADOR };
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.ENTREGADO_PRODUCTOR,
        EstadoAcuerdo.CONFIRMADO_COMPRADOR,
        otroComprador,
        partes,
      ),
    ).toThrow(ForbiddenException);
  });

  it('rechaza cancelación sin motivo', () => {
    expect(() =>
      AgreementStateMachine.assertTransition(
        EstadoAcuerdo.ACEPTADO,
        EstadoAcuerdo.CANCELADO,
        comprador,
        partes,
      ),
    ).toThrow(BadRequestException);
  });
});

describe('AgreementStateMachine — helpers', () => {
  it('isTerminal identifica los estados de cierre', () => {
    expect(AgreementStateMachine.isTerminal(EstadoAcuerdo.CONFIRMADO_COMPRADOR)).toBe(true);
    expect(AgreementStateMachine.isTerminal(EstadoAcuerdo.CANCELADO)).toBe(true);
    expect(AgreementStateMachine.isTerminal(EstadoAcuerdo.INCUMPLIDA_POR_TIEMPO)).toBe(true);
    expect(AgreementStateMachine.isTerminal(EstadoAcuerdo.RESUELTA_CONFIRMADA)).toBe(true);
    expect(AgreementStateMachine.isTerminal(EstadoAcuerdo.PREPARANDO)).toBe(false);
  });

  it('computeEstadoFinal mapea correctamente', () => {
    expect(AgreementStateMachine.computeEstadoFinal(EstadoAcuerdo.CONFIRMADO_COMPRADOR)).toBe(
      'CONFIRMADA',
    );
    expect(AgreementStateMachine.computeEstadoFinal(EstadoAcuerdo.CANCELADO)).toBe('CANCELADA');
    expect(AgreementStateMachine.computeEstadoFinal(EstadoAcuerdo.INCUMPLIDA_POR_TIEMPO)).toBe(
      'INCUMPLIDA',
    );
    expect(AgreementStateMachine.computeEstadoFinal(EstadoAcuerdo.RESUELTA_CONFIRMADA)).toBe(
      'INCUMPLIDA',
    );
    expect(AgreementStateMachine.computeEstadoFinal(EstadoAcuerdo.PREPARANDO)).toBeNull();
  });

  it('allowedNext lista las opciones disponibles desde un estado', () => {
    const next = AgreementStateMachine.allowedNext(EstadoAcuerdo.ACEPTADO);
    expect(next).toContain(EstadoAcuerdo.PREPARANDO);
    expect(next).toContain(EstadoAcuerdo.CANCELADO);
    expect(next).not.toContain(EstadoAcuerdo.CONFIRMADO_COMPRADOR);
  });
});
