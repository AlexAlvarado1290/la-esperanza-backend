-- CreateEnum
CREATE TYPE "NombreRol" AS ENUM ('ADMIN', 'PRODUCTOR', 'COMPRADOR');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "EstadoMaestro" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoProducto" AS ENUM ('DISPONIBLE', 'AGOTADO', 'RETIRADO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('SOLICITADO', 'ACEPTADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoAcuerdo" AS ENUM ('SOLICITADO', 'ACEPTADO', 'PREPARANDO', 'PROGRAMADO', 'EN_RUTA', 'ENTREGADO_PRODUCTOR', 'CONFIRMADO_COMPRADOR', 'CANCELADO', 'INCIDENCIA', 'RESUELTA_CONFIRMADA', 'RESUELTA_DESCARTADA', 'INCUMPLIDA_POR_TIEMPO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'CONTRA_ENTREGA', 'REALIZADO');

-- CreateEnum
CREATE TYPE "EstadoFinal" AS ENUM ('CONFIRMADA', 'INCUMPLIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoReporte" AS ENUM ('INCONFORMIDAD_CANTIDAD', 'INCONFORMIDAD_CALIDAD', 'INCUMPLIMIENTO_ENTREGA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('SOLICITUD_RECIBIDA', 'SOLICITUD_RECHAZADA', 'ACUERDO_ACEPTADO', 'ACUERDO_TRANSICION', 'ACUERDO_CANCELADO', 'MENSAJE_NUEVO', 'ENTREGA_CONFIRMADA', 'INCIDENCIA_REPORTADA', 'INCIDENCIA_RESUELTA', 'PIN_REINICIADO', 'CUENTA_ESTADO_CAMBIADO', 'ALTA_USUARIO');

-- CreateTable
CREATE TABLE "rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" "NombreRol" NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "cui" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT,
    "pin_hash" TEXT NOT NULL,
    "estado_cuenta" "EstadoCuenta" NOT NULL DEFAULT 'ACTIVO',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "must_change_pin" BOOLEAN NOT NULL DEFAULT true,
    "pin_length" INTEGER NOT NULL DEFAULT 4,
    "pin_changed_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "motivo_estado" TEXT,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "categoria_producto" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoMaestro" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "categoria_producto_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "unidad_medida" (
    "id_unidad" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "abreviatura" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoMaestro" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "unidad_medida_pkey" PRIMARY KEY ("id_unidad")
);

-- CreateTable
CREATE TABLE "producto" (
    "id_producto" SERIAL NOT NULL,
    "id_productor" INTEGER NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "id_unidad" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad_disponible" DECIMAL(12,2) NOT NULL,
    "precio_referencial" DECIMAL(12,2) NOT NULL,
    "estado_producto" "EstadoProducto" NOT NULL DEFAULT 'DISPONIBLE',
    "fecha_publicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "solicitud_compra" (
    "id_solicitud" SERIAL NOT NULL,
    "id_comprador" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad_solicitada" DECIMAL(12,2) NOT NULL,
    "mensaje_inicial" TEXT,
    "estado_solicitud" "EstadoSolicitud" NOT NULL DEFAULT 'SOLICITADO',
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo_rechazo" TEXT,

    CONSTRAINT "solicitud_compra_pkey" PRIMARY KEY ("id_solicitud")
);

-- CreateTable
CREATE TABLE "punto_entrega" (
    "id_punto_entrega" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "referencia" TEXT,
    "estado" "EstadoMaestro" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "punto_entrega_pkey" PRIMARY KEY ("id_punto_entrega")
);

-- CreateTable
CREATE TABLE "acuerdo_comercial" (
    "id_acuerdo" SERIAL NOT NULL,
    "id_solicitud" INTEGER NOT NULL,
    "id_punto_entrega" INTEGER NOT NULL,
    "precio_final" DECIMAL(12,2) NOT NULL,
    "cantidad_acordada" DECIMAL(12,2) NOT NULL,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "fecha_entrega_productor" TIMESTAMP(3),
    "fecha_confirmacion_comprador" TIMESTAMP(3),
    "estado_acuerdo" "EstadoAcuerdo" NOT NULL DEFAULT 'ACEPTADO',
    "estado_pago" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "estado_final" "EstadoFinal",
    "justificacion_incumplimiento" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "acuerdo_comercial_pkey" PRIMARY KEY ("id_acuerdo")
);

-- CreateTable
CREATE TABLE "seguimiento_entrega" (
    "id_seguimiento" SERIAL NOT NULL,
    "id_acuerdo" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "estado" "EstadoAcuerdo" NOT NULL,
    "comentario" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimiento_entrega_pkey" PRIMARY KEY ("id_seguimiento")
);

-- CreateTable
CREATE TABLE "mensaje_acuerdo" (
    "id_mensaje" SERIAL NOT NULL,
    "id_acuerdo" INTEGER NOT NULL,
    "id_remitente" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensaje_acuerdo_pkey" PRIMARY KEY ("id_mensaje")
);

-- CreateTable
CREATE TABLE "reporte_incidencia" (
    "id_reporte" SERIAL NOT NULL,
    "id_acuerdo" INTEGER NOT NULL,
    "id_reportante" INTEGER NOT NULL,
    "tipo" "TipoReporte" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado_reporte" "EstadoReporte" NOT NULL DEFAULT 'ABIERTO',
    "resolucion" TEXT,
    "fecha_reporte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporte_incidencia_pkey" PRIMARY KEY ("id_reporte")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id_log" BIGSERIAL NOT NULL,
    "id_usuario" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "valor_antes" JSONB,
    "valor_despues" JSONB,
    "ip" TEXT,
    "resultado" TEXT NOT NULL DEFAULT 'OK',
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id_log")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_cui_key" ON "usuario"("cui");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_telefono_key" ON "usuario"("telefono");

-- CreateIndex
CREATE INDEX "usuario_telefono_idx" ON "usuario"("telefono");

-- CreateIndex
CREATE INDEX "usuario_estado_cuenta_idx" ON "usuario"("estado_cuenta");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_producto_nombre_key" ON "categoria_producto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_medida_nombre_key" ON "unidad_medida"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_medida_abreviatura_key" ON "unidad_medida"("abreviatura");

-- CreateIndex
CREATE INDEX "producto_estado_producto_idx" ON "producto"("estado_producto");

-- CreateIndex
CREATE INDEX "producto_id_productor_idx" ON "producto"("id_productor");

-- CreateIndex
CREATE INDEX "producto_id_categoria_idx" ON "producto"("id_categoria");

-- CreateIndex
CREATE INDEX "solicitud_compra_estado_solicitud_idx" ON "solicitud_compra"("estado_solicitud");

-- CreateIndex
CREATE UNIQUE INDEX "punto_entrega_nombre_key" ON "punto_entrega"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "acuerdo_comercial_id_solicitud_key" ON "acuerdo_comercial"("id_solicitud");

-- CreateIndex
CREATE INDEX "acuerdo_comercial_estado_acuerdo_idx" ON "acuerdo_comercial"("estado_acuerdo");

-- CreateIndex
CREATE INDEX "seguimiento_entrega_id_acuerdo_idx" ON "seguimiento_entrega"("id_acuerdo");

-- CreateIndex
CREATE INDEX "mensaje_acuerdo_id_acuerdo_idx" ON "mensaje_acuerdo"("id_acuerdo");

-- CreateIndex
CREATE INDEX "reporte_incidencia_estado_reporte_idx" ON "reporte_incidencia"("estado_reporte");

-- CreateIndex
CREATE INDEX "audit_log_accion_idx" ON "audit_log"("accion");

-- CreateIndex
CREATE INDEX "audit_log_entidad_idx" ON "audit_log"("entidad");

-- CreateIndex
CREATE INDEX "audit_log_fecha_hora_idx" ON "audit_log"("fecha_hora");

-- CreateIndex
CREATE INDEX "notificacion_id_usuario_leida_idx" ON "notificacion"("id_usuario", "leida");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_id_productor_fkey" FOREIGN KEY ("id_productor") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria_producto"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_id_unidad_fkey" FOREIGN KEY ("id_unidad") REFERENCES "unidad_medida"("id_unidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_compra" ADD CONSTRAINT "solicitud_compra_id_comprador_fkey" FOREIGN KEY ("id_comprador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_compra" ADD CONSTRAINT "solicitud_compra_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acuerdo_comercial" ADD CONSTRAINT "acuerdo_comercial_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitud_compra"("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acuerdo_comercial" ADD CONSTRAINT "acuerdo_comercial_id_punto_entrega_fkey" FOREIGN KEY ("id_punto_entrega") REFERENCES "punto_entrega"("id_punto_entrega") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_entrega" ADD CONSTRAINT "seguimiento_entrega_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_entrega" ADD CONSTRAINT "seguimiento_entrega_id_acuerdo_fkey" FOREIGN KEY ("id_acuerdo") REFERENCES "acuerdo_comercial"("id_acuerdo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_acuerdo" ADD CONSTRAINT "mensaje_acuerdo_id_acuerdo_fkey" FOREIGN KEY ("id_acuerdo") REFERENCES "acuerdo_comercial"("id_acuerdo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensaje_acuerdo" ADD CONSTRAINT "mensaje_acuerdo_id_remitente_fkey" FOREIGN KEY ("id_remitente") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_incidencia" ADD CONSTRAINT "reporte_incidencia_id_acuerdo_fkey" FOREIGN KEY ("id_acuerdo") REFERENCES "acuerdo_comercial"("id_acuerdo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_incidencia" ADD CONSTRAINT "reporte_incidencia_id_reportante_fkey" FOREIGN KEY ("id_reportante") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
