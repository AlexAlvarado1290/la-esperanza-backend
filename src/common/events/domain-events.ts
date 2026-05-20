// PATRÓN: Observer — los servicios emiten eventos de dominio aquí enumerados
// y AuditService + NotificationsService se suscriben sin acoplamiento directo
// (DERCAS Anexo B.7, RNF27).

export enum DomainEvent {
  // Auth
  LoginExitoso = 'auth.login.exitoso',
  LoginFallido = 'auth.login.fallido',
  PinCambiado = 'auth.pin.cambiado',
  AccesoDenegado = 'auth.acceso.denegado',

  // Users
  UsuarioCreado = 'usuario.creado',
  UsuarioEditado = 'usuario.editado',
  UsuarioPinReiniciado = 'usuario.pin.reiniciado',
  UsuarioEstadoCambiado = 'usuario.estado.cambiado',

  // Master data
  CatalogoMaestroCreado = 'maestro.creado',
  CatalogoMaestroEditado = 'maestro.editado',

  // Products
  ProductoCreado = 'producto.creado',
  ProductoEditado = 'producto.editado',
  ProductoRetirado = 'producto.retirado',

  // Requests + Agreements
  SolicitudCreada = 'solicitud.creada',
  SolicitudAceptada = 'solicitud.aceptada',
  SolicitudRechazada = 'solicitud.rechazada',
  AcuerdoTransicion = 'acuerdo.transicion',
  AcuerdoCancelado = 'acuerdo.cancelado',
  AcuerdoEntregado = 'acuerdo.entregado',
  AcuerdoConfirmado = 'acuerdo.confirmado',
  AcuerdoMensajeEnviado = 'acuerdo.mensaje',
  AcuerdoPagoActualizado = 'acuerdo.pago',

  // Incidents
  IncidenciaReportada = 'incidencia.reportada',
  IncidenciaResuelta = 'incidencia.resuelta',
  CancelacionForzada = 'acuerdo.cancelacion.forzada',
}

export interface DomainEventPayload {
  idUsuario?: number;
  accion: string;
  entidad: string;
  entidadId?: string;
  valorAntes?: unknown;
  valorDespues?: unknown;
  metadata?: Record<string, unknown>;
}
