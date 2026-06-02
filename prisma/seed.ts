/**
 * Seed para v1.0.0 — datos de demo del sistema La Esperanza.
 *
 * Filosofía de los datos:
 *   - Los 3 usuarios de los roles principales (admin/productor/comprador) ya
 *     tienen un PIN definitivo y must_change_pin=false → la presentación entra
 *     directo sin fricción.
 *   - 6 usuarios adicionales (3 productores y 3 compradores) traen PIN inicial
 *     y must_change_pin=true → sirven para mostrar el flujo de primer login.
 *   - El catálogo cubre las 4 categorías y refleja el contexto agrícola rural
 *     de la comunidad descrita en el DERCAS.
 *   - 4 acuerdos en distintos estados de la máquina (CONFIRMADO_COMPRADOR,
 *     EN_RUTA, PREPARANDO, ACEPTADO) permiten enseñar el ciclo completo sin
 *     tener que avanzarlos en vivo.
 *   - 2 solicitudes pendientes, mensajes de negociación y una incidencia
 *     resuelta alimentan los reportes y la bitácora desde el primer instante.
 *
 * Política de PIN (RF26 + RNF13):
 *   - admin   → 6 dígitos
 *   - resto   → 4 dígitos
 *
 * Para una BD limpia: `pnpm prisma migrate reset --force` (corre el seed).
 */

import {
  EstadoAcuerdo,
  EstadoFinal,
  EstadoMaestro,
  EstadoPago,
  EstadoProducto,
  EstadoReporte,
  EstadoSolicitud,
  NombreRol,
  PrismaClient,
  Prisma,
  TipoReporte,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 3600 * 1000);

async function main() {
  console.log('🌱 Sembrando datos de demo (v1.0.0)…');

  // 1. Roles ----------------------------------------------------------------
  const [rolAdmin, rolProductor, rolComprador] = await Promise.all([
    prisma.rol.upsert({
      where: { nombre: NombreRol.ADMIN },
      update: {},
      create: { nombre: NombreRol.ADMIN, descripcion: 'Asociación / Administrador.' },
    }),
    prisma.rol.upsert({
      where: { nombre: NombreRol.PRODUCTOR },
      update: {},
      create: { nombre: NombreRol.PRODUCTOR, descripcion: 'Productor agrícola de la comunidad.' },
    }),
    prisma.rol.upsert({
      where: { nombre: NombreRol.COMPRADOR },
      update: {},
      create: { nombre: NombreRol.COMPRADOR, descripcion: 'Comprador final o intermediario.' },
    }),
  ]);

  // 2. Usuarios -------------------------------------------------------------
  const hash4 = await bcrypt.hash('0000', 10);
  const hashAdmin6 = await bcrypt.hash('111111', 10);
  const hashProductor4 = await bcrypt.hash('2222', 10);
  const hashComprador4 = await bcrypt.hash('3333', 10);

  // 2.1 Usuarios principales (PIN definitivo, sin fricción)
  const upsertUser = (data: Prisma.UsuarioUpsertArgs) => prisma.usuario.upsert(data);

  const admin = await upsertUser({
    where: { telefono: '0999999991' },
    update: {
      nombreCompleto: 'María López Fuentes — Asociación La Esperanza',
      direccion: 'Sede de la Asociación, frente al parque central',
      pinHash: hashAdmin6,
      pinLength: 6,
      mustChangePin: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      cui: '0000000000001',
      nombreCompleto: 'María López Fuentes — Asociación La Esperanza',
      telefono: '0999999991',
      direccion: 'Sede de la Asociación, frente al parque central',
      pinHash: hashAdmin6,
      pinLength: 6,
      mustChangePin: false,
      idRol: rolAdmin.idRol,
    },
  });

  const juan = await upsertUser({
    where: { telefono: '0999999992' },
    update: {
      nombreCompleto: 'Juan Pérez Tzul',
      direccion: 'Aldea Las Flores, La Esperanza',
      pinHash: hashProductor4,
      pinLength: 4,
      mustChangePin: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      cui: '0000000000002',
      nombreCompleto: 'Juan Pérez Tzul',
      telefono: '0999999992',
      direccion: 'Aldea Las Flores, La Esperanza',
      pinHash: hashProductor4,
      pinLength: 4,
      mustChangePin: false,
      idRol: rolProductor.idRol,
    },
  });

  const carlos = await upsertUser({
    where: { telefono: '0999999993' },
    update: {
      nombreCompleto: 'Carlos Méndez — Mercado Central',
      direccion: 'Mercado Municipal, puesto 12',
      pinHash: hashComprador4,
      pinLength: 4,
      mustChangePin: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      cui: '0000000000003',
      nombreCompleto: 'Carlos Méndez — Mercado Central',
      telefono: '0999999993',
      direccion: 'Mercado Municipal, puesto 12',
      pinHash: hashComprador4,
      pinLength: 4,
      mustChangePin: false,
      idRol: rolComprador.idRol,
    },
  });

  // 2.2 Productores adicionales (PIN inicial 0000, deben cambiarlo)
  const rosa = await upsertUser({
    where: { telefono: '0998888881' },
    update: {},
    create: {
      cui: '0000000000004',
      nombreCompleto: 'Rosa Mendoza Coc',
      telefono: '0998888881',
      direccion: 'Caserío El Mirador',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolProductor.idRol,
    },
  });

  const pedro = await upsertUser({
    where: { telefono: '0998888882' },
    update: {},
    create: {
      cui: '0000000000005',
      nombreCompleto: 'Pedro García Velásquez',
      telefono: '0998888882',
      direccion: 'Aldea San Antonio',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolProductor.idRol,
    },
  });

  const ana = await upsertUser({
    where: { telefono: '0998888883' },
    update: {},
    create: {
      cui: '0000000000006',
      nombreCompleto: 'Ana Chávez de León',
      telefono: '0998888883',
      direccion: 'Caserío Buenos Aires',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolProductor.idRol,
    },
  });

  // 2.3 Compradores adicionales (PIN inicial 0000)
  const mariaComedor = await upsertUser({
    where: { telefono: '0997777771' },
    update: {},
    create: {
      cui: '0000000000007',
      nombreCompleto: 'María Ramírez — Comedor "La Tradición"',
      telefono: '0997777771',
      direccion: 'Calle del Comercio 4-12, centro urbano',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolComprador.idRol,
    },
  });

  const manuelTienda = await upsertUser({
    where: { telefono: '0997777772' },
    update: {},
    create: {
      cui: '0000000000008',
      nombreCompleto: 'Manuel Ortiz — Tienda "El Surtidor"',
      telefono: '0997777772',
      direccion: 'Aldea principal, calle 3',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolComprador.idRol,
    },
  });

  const sandraDistri = await upsertUser({
    where: { telefono: '0997777773' },
    update: {},
    create: {
      cui: '0000000000009',
      nombreCompleto: 'Sandra López — Distribuidora "Las Verduras"',
      telefono: '0997777773',
      direccion: 'Bodega 7, ciudad cercana',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolComprador.idRol,
    },
  });

  // 3. Catálogos maestros ---------------------------------------------------
  const [catHortalizas, catGranos, catFrutas, catHierbas] = await Promise.all([
    prisma.categoriaProducto.upsert({
      where: { nombre: 'Hortalizas' },
      update: {},
      create: { nombre: 'Hortalizas', descripcion: 'Verduras y vegetales frescos.' },
    }),
    prisma.categoriaProducto.upsert({
      where: { nombre: 'Granos básicos' },
      update: {},
      create: { nombre: 'Granos básicos', descripcion: 'Maíz, frijol, arroz.' },
    }),
    prisma.categoriaProducto.upsert({
      where: { nombre: 'Frutas' },
      update: {},
      create: { nombre: 'Frutas', descripcion: 'Frutas de temporada.' },
    }),
    prisma.categoriaProducto.upsert({
      where: { nombre: 'Hierbas' },
      update: {},
      create: { nombre: 'Hierbas', descripcion: 'Hierbas aromáticas y medicinales.' },
    }),
  ]);

  const [uniLibra, uniQuintal, uniDocena, uniSaco, uniManojo] = await Promise.all([
    prisma.unidadMedida.upsert({
      where: { nombre: 'Libra' },
      update: {},
      create: { nombre: 'Libra', abreviatura: 'lb', descripcion: 'Libra (≈453.6 g).' },
    }),
    prisma.unidadMedida.upsert({
      where: { nombre: 'Quintal' },
      update: {},
      create: { nombre: 'Quintal', abreviatura: 'qq', descripcion: 'Quintal (100 lb).' },
    }),
    prisma.unidadMedida.upsert({
      where: { nombre: 'Docena' },
      update: {},
      create: { nombre: 'Docena', abreviatura: 'doc', descripcion: '12 unidades.' },
    }),
    prisma.unidadMedida.upsert({
      where: { nombre: 'Saco' },
      update: {},
      create: { nombre: 'Saco', abreviatura: 'saco', descripcion: 'Saco estándar de 50 lb.' },
    }),
    prisma.unidadMedida.upsert({
      where: { nombre: 'Manojo' },
      update: {},
      create: { nombre: 'Manojo', abreviatura: 'man', descripcion: 'Manojo (atado pequeño de hierbas/verduras).' },
    }),
  ]);

  const [puntoCentral, puntoFeria, puntoBodega, puntoCoop] = await Promise.all([
    prisma.puntoEntrega.upsert({
      where: { nombre: 'Centro Comunal La Esperanza' },
      update: {},
      create: {
        nombre: 'Centro Comunal La Esperanza',
        descripcion: 'Punto principal de entrega comunitario.',
        referencia: 'Frente a la iglesia, calle principal.',
      },
    }),
    prisma.puntoEntrega.upsert({
      where: { nombre: 'Feria del Productor' },
      update: {},
      create: {
        nombre: 'Feria del Productor',
        descripcion: 'Espacio compartido los días sábados.',
        referencia: 'Cancha municipal.',
      },
    }),
    prisma.puntoEntrega.upsert({
      where: { nombre: 'Bodega Central' },
      update: {},
      create: {
        nombre: 'Bodega Central',
        descripcion: 'Bodega administrada por la Asociación.',
        referencia: 'A 200 m del centro comunal.',
      },
    }),
    prisma.puntoEntrega.upsert({
      where: { nombre: 'Cooperativa La Esperanza' },
      update: {},
      create: {
        nombre: 'Cooperativa La Esperanza',
        descripcion: 'Punto alterno gestionado por la cooperativa.',
        referencia: 'Edificio de la cooperativa, 2da avenida.',
      },
    }),
  ]);

  // 4. Productos del catálogo ----------------------------------------------
  type SeedProduct = {
    productor: { idUsuario: number };
    nombre: string;
    descripcion: string;
    idCategoria: number;
    idUnidad: number;
    cantidad: number;
    precio: number;
  };

  const productosSeed: SeedProduct[] = [
    // Juan Pérez Tzul (productor histórico)
    { productor: juan, nombre: 'Tomate roma', descripcion: 'Tomate maduro, cosecha de la semana.', idCategoria: catHortalizas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 150, precio: 4.5 },
    { productor: juan, nombre: 'Lechuga romana', descripcion: 'Lechuga fresca cortada en la mañana.', idCategoria: catHortalizas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 40, precio: 6 },
    { productor: juan, nombre: 'Naranja Valencia', descripcion: 'Naranja jugosa, sin químicos.', idCategoria: catFrutas.idCategoria, idUnidad: uniDocena.idUnidad, cantidad: 60, precio: 12 },
    { productor: juan, nombre: 'Cilantro', descripcion: 'Cilantro fresco, recién cortado.', idCategoria: catHierbas.idCategoria, idUnidad: uniManojo.idUnidad, cantidad: 50, precio: 3 },
    { productor: juan, nombre: 'Frijol rojo', descripcion: 'Frijol rojo de la última cosecha.', idCategoria: catGranos.idCategoria, idUnidad: uniSaco.idUnidad, cantidad: 5, precio: 420 },

    // Rosa Mendoza Coc
    { productor: rosa, nombre: 'Zanahoria', descripcion: 'Zanahoria mediana, cosecha local.', idCategoria: catHortalizas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 80, precio: 4 },
    { productor: rosa, nombre: 'Cebolla blanca', descripcion: 'Cebolla blanca grande.', idCategoria: catHortalizas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 60, precio: 5 },
    { productor: rosa, nombre: 'Frijol negro', descripcion: 'Frijol limpio, sacos de 50 libras.', idCategoria: catGranos.idCategoria, idUnidad: uniSaco.idUnidad, cantidad: 12, precio: 380 },

    // Pedro García Velásquez
    { productor: pedro, nombre: 'Maíz blanco', descripcion: 'Maíz seco para tortilla, calidad primera.', idCategoria: catGranos.idCategoria, idUnidad: uniQuintal.idUnidad, cantidad: 8, precio: 220 },
    { productor: pedro, nombre: 'Manzana criolla', descripcion: 'Manzana de la zona alta, dulce.', idCategoria: catFrutas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 100, precio: 8 },
    { productor: pedro, nombre: 'Durazno', descripcion: 'Durazno maduro de temporada.', idCategoria: catFrutas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 80, precio: 15 },

    // Ana Chávez de León
    { productor: ana, nombre: 'Brócoli', descripcion: 'Brócoli orgánico, cosechado a mano.', idCategoria: catHortalizas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 25, precio: 12 },
    { productor: ana, nombre: 'Mora', descripcion: 'Mora silvestre, en su punto.', idCategoria: catFrutas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 20, precio: 25 },
    { productor: ana, nombre: 'Fresa', descripcion: 'Fresa de la zona alta, dulce y firme.', idCategoria: catFrutas.idCategoria, idUnidad: uniLibra.idUnidad, cantidad: 30, precio: 35 },
    { productor: ana, nombre: 'Hierbabuena', descripcion: 'Hierbabuena fresca, recién cortada.', idCategoria: catHierbas.idCategoria, idUnidad: uniManojo.idUnidad, cantidad: 30, precio: 3 },
  ];

  const productosById: Record<string, { idProducto: number; cantidadDisponible: Prisma.Decimal }> = {};
  for (const p of productosSeed) {
    const existing = await prisma.producto.findFirst({
      where: { nombre: p.nombre, idProductor: p.productor.idUsuario },
    });
    if (existing) {
      productosById[p.nombre] = {
        idProducto: existing.idProducto,
        cantidadDisponible: existing.cantidadDisponible,
      };
      continue;
    }
    const created = await prisma.producto.create({
      data: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        cantidadDisponible: new Prisma.Decimal(p.cantidad),
        precioReferencial: new Prisma.Decimal(p.precio),
        estadoProducto: EstadoProducto.DISPONIBLE,
        idProductor: p.productor.idUsuario,
        idCategoria: p.idCategoria,
        idUnidad: p.idUnidad,
      },
    });
    productosById[p.nombre] = {
      idProducto: created.idProducto,
      cantidadDisponible: created.cantidadDisponible,
    };
  }

  // 5. Acuerdos en distintos estados ---------------------------------------
  // Para cada acuerdo creamos la solicitud → reservamos stock → creamos el
  // acuerdo en el estado deseado → registramos la bitácora completa hasta ese
  // estado. La idempotencia se garantiza buscando por (comprador, producto).

  type SeedAgreement = {
    comprador: { idUsuario: number };
    productor: { idUsuario: number };
    productoNombre: string;
    cantidad: number;
    precioFinal: number;
    idPuntoEntrega: number;
    estadoFinal: EstadoAcuerdo;
    pago: EstadoPago;
    estadoFinalCierre?: EstadoFinal;
    fechaProgramadaOffset: number; // días desde hoy
    observaciones?: string;
    mensajes?: { remitente: { idUsuario: number }; texto: string }[];
    incidencia?: {
      reportante: { idUsuario: number };
      tipo: TipoReporte;
      descripcion: string;
      estado: EstadoReporte;
      resolucion?: string;
    };
  };

  const acuerdosSeed: SeedAgreement[] = [
    // 1) Acuerdo cerrado feliz hace unos días (CONFIRMADO_COMPRADOR) — alimenta reportes.
    {
      comprador: carlos,
      productor: juan,
      productoNombre: 'Tomate roma',
      cantidad: 25,
      precioFinal: 4.5,
      idPuntoEntrega: puntoCentral.idPuntoEntrega,
      estadoFinal: EstadoAcuerdo.CONFIRMADO_COMPRADOR,
      pago: EstadoPago.REALIZADO,
      estadoFinalCierre: EstadoFinal.CONFIRMADA,
      fechaProgramadaOffset: -2,
      observaciones: 'Entregado en el centro comunal el jueves a primera hora.',
      mensajes: [
        { remitente: carlos, texto: '¿Lo puede tener listo el jueves a las 8?' },
        { remitente: juan, texto: 'Confirmado. Lo dejaré apartado.' },
      ],
      incidencia: {
        reportante: carlos,
        tipo: TipoReporte.INCONFORMIDAD_CANTIDAD,
        descripcion: 'Pesé en mi báscula y faltaba 1 libra.',
        estado: EstadoReporte.DESCARTADO,
        resolucion: 'Diferencia dentro de tolerancia comunitaria (±2 %). Sin penalización.',
      },
    },
    // 2) Acuerdo en EN_RUTA (Productor saliendo a entregar)
    {
      comprador: mariaComedor,
      productor: ana,
      productoNombre: 'Brócoli',
      cantidad: 10,
      precioFinal: 11,
      idPuntoEntrega: puntoFeria.idPuntoEntrega,
      estadoFinal: EstadoAcuerdo.EN_RUTA,
      pago: EstadoPago.CONTRA_ENTREGA,
      fechaProgramadaOffset: 0,
      observaciones: 'Para el menú del día. Cantidad cerrada en cosecha matutina.',
      mensajes: [
        { remitente: mariaComedor, texto: '¿Está saliendo ya con el brócoli?' },
        { remitente: ana, texto: 'Sí, salgo en 15 minutos. Pago contra entrega.' },
      ],
    },
    // 3) Acuerdo en PREPARANDO
    {
      comprador: manuelTienda,
      productor: pedro,
      productoNombre: 'Maíz blanco',
      cantidad: 2,
      precioFinal: 215,
      idPuntoEntrega: puntoBodega.idPuntoEntrega,
      estadoFinal: EstadoAcuerdo.PREPARANDO,
      pago: EstadoPago.PENDIENTE,
      fechaProgramadaOffset: 2,
      observaciones: 'Para la temporada alta de la tienda.',
      mensajes: [
        { remitente: manuelTienda, texto: '¿Mañana ya tendrías los 2 quintales empacados?' },
        { remitente: pedro, texto: 'Empezando hoy a empacar. Lo confirmo mañana al medio día.' },
      ],
    },
    // 4) Acuerdo recién aceptado (ACEPTADO)
    {
      comprador: sandraDistri,
      productor: juan,
      productoNombre: 'Naranja Valencia',
      cantidad: 15,
      precioFinal: 11.5,
      idPuntoEntrega: puntoCoop.idPuntoEntrega,
      estadoFinal: EstadoAcuerdo.ACEPTADO,
      pago: EstadoPago.PENDIENTE,
      fechaProgramadaOffset: 4,
      observaciones: 'Para la distribución regional del viernes.',
      mensajes: [
        { remitente: sandraDistri, texto: '¿Es naranja Valencia legítima?' },
        { remitente: juan, texto: 'Sí, cosechada esta misma semana.' },
      ],
    },
  ];

  // Secuencia "natural" de estados (5.13 del DERCAS).
  const SECUENCIA_PRINCIPAL: EstadoAcuerdo[] = [
    EstadoAcuerdo.ACEPTADO,
    EstadoAcuerdo.PREPARANDO,
    EstadoAcuerdo.PROGRAMADO,
    EstadoAcuerdo.EN_RUTA,
    EstadoAcuerdo.ENTREGADO_PRODUCTOR,
    EstadoAcuerdo.CONFIRMADO_COMPRADOR,
  ];

  for (const a of acuerdosSeed) {
    const producto = productosById[a.productoNombre];
    const yaExiste = await prisma.solicitudCompra.findFirst({
      where: {
        idComprador: a.comprador.idUsuario,
        idProducto: producto.idProducto,
      },
    });
    if (yaExiste) continue;

    const fechaProgramada = daysFromNow(a.fechaProgramadaOffset);
    const indiceEstado = SECUENCIA_PRINCIPAL.indexOf(a.estadoFinal);
    if (indiceEstado === -1) {
      throw new Error(`Estado fuera de la secuencia principal: ${a.estadoFinal}`);
    }

    await prisma.$transaction(async (tx) => {
      // Solicitud → aceptada.
      const sol = await tx.solicitudCompra.create({
        data: {
          idComprador: a.comprador.idUsuario,
          idProducto: producto.idProducto,
          cantidadSolicitada: new Prisma.Decimal(a.cantidad),
          mensajeInicial: a.observaciones ?? null,
          estadoSolicitud: EstadoSolicitud.ACEPTADA,
        },
      });

      // Reserva de stock (RF15).
      const nuevoStock = Number(producto.cantidadDisponible) - a.cantidad;
      await tx.producto.update({
        where: { idProducto: producto.idProducto },
        data: {
          cantidadDisponible: new Prisma.Decimal(Math.max(nuevoStock, 0)),
          estadoProducto:
            nuevoStock <= 0 ? EstadoProducto.AGOTADO : EstadoProducto.DISPONIBLE,
        },
      });
      producto.cantidadDisponible = new Prisma.Decimal(Math.max(nuevoStock, 0));

      // Acuerdo en el estado destino.
      const acuerdo = await tx.acuerdoComercial.create({
        data: {
          idSolicitud: sol.idSolicitud,
          idPuntoEntrega: a.idPuntoEntrega,
          precioFinal: new Prisma.Decimal(a.precioFinal),
          cantidadAcordada: new Prisma.Decimal(a.cantidad),
          fechaProgramada,
          fechaEntregaProductor:
            indiceEstado >= SECUENCIA_PRINCIPAL.indexOf(EstadoAcuerdo.ENTREGADO_PRODUCTOR)
              ? daysFromNow(a.fechaProgramadaOffset)
              : null,
          fechaConfirmacionComprador:
            a.estadoFinal === EstadoAcuerdo.CONFIRMADO_COMPRADOR
              ? daysFromNow(a.fechaProgramadaOffset)
              : null,
          estadoAcuerdo: a.estadoFinal,
          estadoPago: a.pago,
          estadoFinal: a.estadoFinalCierre ?? null,
          observaciones: a.observaciones ?? null,
        },
      });

      // Bitácora: registra TODAS las transiciones hasta el estado destino.
      const actorPorEstado: Record<string, number> = {
        [EstadoAcuerdo.ACEPTADO]: a.productor.idUsuario,
        [EstadoAcuerdo.PREPARANDO]: a.productor.idUsuario,
        [EstadoAcuerdo.PROGRAMADO]: a.productor.idUsuario,
        [EstadoAcuerdo.EN_RUTA]: a.productor.idUsuario,
        [EstadoAcuerdo.ENTREGADO_PRODUCTOR]: a.productor.idUsuario,
        [EstadoAcuerdo.CONFIRMADO_COMPRADOR]: a.comprador.idUsuario,
      };
      const comentarios: Record<string, string> = {
        [EstadoAcuerdo.ACEPTADO]: 'Acuerdo aceptado y programado.',
        [EstadoAcuerdo.PREPARANDO]: 'Productor inició preparación de la cosecha.',
        [EstadoAcuerdo.PROGRAMADO]: 'Entrega agendada en el punto acordado.',
        [EstadoAcuerdo.EN_RUTA]: 'Productor salió a entregar.',
        [EstadoAcuerdo.ENTREGADO_PRODUCTOR]: 'Producto entregado en el punto.',
        [EstadoAcuerdo.CONFIRMADO_COMPRADOR]: 'Comprador confirmó recepción.',
      };
      for (let i = 0; i <= indiceEstado; i++) {
        const estado = SECUENCIA_PRINCIPAL[i];
        await tx.seguimientoEntrega.create({
          data: {
            idAcuerdo: acuerdo.idAcuerdo,
            idUsuario: actorPorEstado[estado],
            estado,
            comentario: comentarios[estado],
          },
        });
      }

      // Mensajes de negociación.
      if (a.mensajes) {
        for (const m of a.mensajes) {
          await tx.mensajeAcuerdo.create({
            data: {
              idAcuerdo: acuerdo.idAcuerdo,
              idRemitente: m.remitente.idUsuario,
              mensaje: m.texto,
            },
          });
        }
      }

      // Incidencia opcional.
      if (a.incidencia) {
        await tx.reporteIncidencia.create({
          data: {
            idAcuerdo: acuerdo.idAcuerdo,
            idReportante: a.incidencia.reportante.idUsuario,
            tipo: a.incidencia.tipo,
            descripcion: a.incidencia.descripcion,
            estadoReporte: a.incidencia.estado,
            resolucion: a.incidencia.resolucion ?? null,
          },
        });
      }
    });
  }

  // 6. Solicitudes pendientes ----------------------------------------------
  type SeedSolicitud = {
    comprador: { idUsuario: number };
    productor: { idUsuario: number };
    productoNombre: string;
    cantidad: number;
    mensaje: string;
  };

  const solicitudesPendientes: SeedSolicitud[] = [
    {
      comprador: mariaComedor,
      productor: ana,
      productoNombre: 'Mora',
      cantidad: 5,
      mensaje: '¿Tendrías 5 libras para postre de fin de semana?',
    },
    {
      comprador: manuelTienda,
      productor: rosa,
      productoNombre: 'Frijol negro',
      cantidad: 3,
      mensaje: 'Pago al contado al recibir. ¿Cuándo lo puedes tener?',
    },
  ];

  for (const s of solicitudesPendientes) {
    const producto = productosById[s.productoNombre];
    const ya = await prisma.solicitudCompra.findFirst({
      where: { idComprador: s.comprador.idUsuario, idProducto: producto.idProducto },
    });
    if (ya) continue;
    await prisma.solicitudCompra.create({
      data: {
        idComprador: s.comprador.idUsuario,
        idProducto: producto.idProducto,
        cantidadSolicitada: new Prisma.Decimal(s.cantidad),
        mensajeInicial: s.mensaje,
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
      },
    });
  }

  // 7. Resumen --------------------------------------------------------------
  const stats = {
    usuarios: await prisma.usuario.count(),
    productos: await prisma.producto.count(),
    solicitudes: await prisma.solicitudCompra.count(),
    acuerdos: await prisma.acuerdoComercial.count(),
    bitacora: await prisma.seguimientoEntrega.count(),
    mensajes: await prisma.mensajeAcuerdo.count(),
    incidencias: await prisma.reporteIncidencia.count(),
  };

  console.log('✅ Seed completado:');
  console.log('   Credenciales sin cambio de PIN (entran directo):');
  console.log('     admin       0999999991 / 111111  (María López — Asociación)');
  console.log('     productor   0999999992 / 2222    (Juan Pérez Tzul)');
  console.log('     comprador   0999999993 / 3333    (Carlos Méndez — Mercado)');
  console.log('   Usuarios con PIN inicial 0000 (deben cambiarlo al primer login):');
  console.log('     productor   0998888881 / 0000    (Rosa Mendoza)');
  console.log('     productor   0998888882 / 0000    (Pedro García)');
  console.log('     productor   0998888883 / 0000    (Ana Chávez)');
  console.log('     comprador   0997777771 / 0000    (María Ramírez — Comedor)');
  console.log('     comprador   0997777772 / 0000    (Manuel Ortiz — Tienda)');
  console.log('     comprador   0997777773 / 0000    (Sandra López — Distribuidora)');
  console.log('   Conteos finales:', stats);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
