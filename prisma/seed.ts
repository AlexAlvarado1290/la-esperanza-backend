/**
 * Seed obligatorio para la fase III del proyecto.
 *
 * Carga los usuarios de prueba, los catálogos maestros, productos demo y un
 * acuerdo en estado ACEPTADO con cantidad reservada para poder ejercitar
 * el flujo de seguimiento end-to-end.
 *
 * Política de PIN (RF26 + RNF13 — confirmada por el usuario):
 *   - admin   → 6 dígitos iniciales "000000" + must_change_pin=true
 *   - prod/buy→ 4 dígitos iniciales "0000"   + must_change_pin=true
 *
 * Tras el primer login, los usuarios cambian a los PINs históricos del
 * prototipo (admin 111111 — antes era 1111 — productor 2222, comprador 3333).
 */

import {
  EstadoAcuerdo,
  EstadoMaestro,
  EstadoProducto,
  EstadoSolicitud,
  NombreRol,
  PrismaClient,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando datos de prueba…');

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

  // 2. Usuarios de prueba ---------------------------------------------------
  const hash4 = await bcrypt.hash('0000', 10);
  const hash6 = await bcrypt.hash('000000', 10);

  const admin = await prisma.usuario.upsert({
    where: { telefono: '0999999991' },
    update: {},
    create: {
      cui: '0000000000001',
      nombreCompleto: 'María López — Administradora Asociación',
      telefono: '0999999991',
      direccion: 'Sede Asociación Comunitaria La Esperanza',
      pinHash: hash6,
      pinLength: 6,
      mustChangePin: true,
      idRol: rolAdmin.idRol,
    },
  });

  const productor = await prisma.usuario.upsert({
    where: { telefono: '0999999992' },
    update: {},
    create: {
      cui: '0000000000002',
      nombreCompleto: 'Juan Pérez — Productor',
      telefono: '0999999992',
      direccion: 'Aldea Las Flores, La Esperanza',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolProductor.idRol,
    },
  });

  const comprador = await prisma.usuario.upsert({
    where: { telefono: '0999999993' },
    update: {},
    create: {
      cui: '0000000000003',
      nombreCompleto: 'Carlos Méndez — Comprador',
      telefono: '0999999993',
      direccion: 'Mercado Central, ciudad cercana',
      pinHash: hash4,
      pinLength: 4,
      mustChangePin: true,
      idRol: rolComprador.idRol,
    },
  });

  // 3. Catálogos maestros ---------------------------------------------------
  const [catHortalizas, catGranos, catFrutas] = await Promise.all([
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
  ]);

  const [uniLibra, uniQuintal, uniDocena, uniSaco] = await Promise.all([
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
  ]);

  const [puntoCentral, puntoFeria, puntoBodega] = await Promise.all([
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
  ]);

  // 4. 6 productos del productor demo --------------------------------------
  const productos = await Promise.all(
    [
      {
        nombre: 'Tomate roma',
        idCategoria: catHortalizas.idCategoria,
        idUnidad: uniLibra.idUnidad,
        cantidad: 150,
        precio: 4.5,
        descripcion: 'Tomate maduro, cosecha de la semana.',
      },
      {
        nombre: 'Maíz blanco',
        idCategoria: catGranos.idCategoria,
        idUnidad: uniQuintal.idUnidad,
        cantidad: 8,
        precio: 220,
        descripcion: 'Maíz seco para tortilla, calidad primera.',
      },
      {
        nombre: 'Frijol negro',
        idCategoria: catGranos.idCategoria,
        idUnidad: uniSaco.idUnidad,
        cantidad: 12,
        precio: 380,
        descripcion: 'Frijol limpio, sacos de 50 libras.',
      },
      {
        nombre: 'Naranja Valencia',
        idCategoria: catFrutas.idCategoria,
        idUnidad: uniDocena.idUnidad,
        cantidad: 60,
        precio: 12,
        descripcion: 'Naranja jugosa, sin químicos.',
      },
      {
        nombre: 'Lechuga romana',
        idCategoria: catHortalizas.idCategoria,
        idUnidad: uniLibra.idUnidad,
        cantidad: 40,
        precio: 6,
        descripcion: 'Lechuga fresca cortada en la mañana.',
      },
      {
        nombre: 'Banano criollo',
        idCategoria: catFrutas.idCategoria,
        idUnidad: uniDocena.idUnidad,
        cantidad: 25,
        precio: 10,
        descripcion: 'Banano maduro, recolectado a mano.',
      },
    ].map(async (p) => {
      const existing = await prisma.producto.findFirst({
        where: { nombre: p.nombre, idProductor: productor.idUsuario },
      });
      if (existing) return existing;
      return prisma.producto.create({
        data: {
          nombre: p.nombre,
          descripcion: p.descripcion,
          cantidadDisponible: new Prisma.Decimal(p.cantidad),
          precioReferencial: new Prisma.Decimal(p.precio),
          estadoProducto: EstadoProducto.DISPONIBLE,
          idProductor: productor.idUsuario,
          idCategoria: p.idCategoria,
          idUnidad: p.idUnidad,
        },
      });
    }),
  );

  // 5. 1 acuerdo aceptado con cantidad reservada y bitácora ----------------
  const productoAcuerdo = productos[0]; // Tomate roma
  const yaExiste = await prisma.solicitudCompra.findFirst({
    where: { idComprador: comprador.idUsuario, idProducto: productoAcuerdo.idProducto },
  });

  if (!yaExiste) {
    const cantidad = 25;
    const precioFinal = 4.5;
    const fechaProgramada = new Date(Date.now() + 3 * 24 * 3600 * 1000);

    await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitudCompra.create({
        data: {
          idComprador: comprador.idUsuario,
          idProducto: productoAcuerdo.idProducto,
          cantidadSolicitada: new Prisma.Decimal(cantidad),
          mensajeInicial: '¿Pueden tenerlo seleccionado para entregar el jueves?',
          estadoSolicitud: EstadoSolicitud.ACEPTADA,
        },
      });

      // Reservamos stock como lo haría el flujo real (RF15).
      await tx.producto.update({
        where: { idProducto: productoAcuerdo.idProducto },
        data: {
          cantidadDisponible: new Prisma.Decimal(
            Number(productoAcuerdo.cantidadDisponible) - cantidad,
          ),
        },
      });

      const acuerdo = await tx.acuerdoComercial.create({
        data: {
          idSolicitud: sol.idSolicitud,
          idPuntoEntrega: puntoCentral.idPuntoEntrega,
          precioFinal: new Prisma.Decimal(precioFinal),
          cantidadAcordada: new Prisma.Decimal(cantidad),
          fechaProgramada,
          estadoAcuerdo: EstadoAcuerdo.ACEPTADO,
          observaciones: 'Recogeré personalmente en el centro comunal.',
        },
      });

      await tx.seguimientoEntrega.create({
        data: {
          idAcuerdo: acuerdo.idAcuerdo,
          idUsuario: productor.idUsuario,
          estado: EstadoAcuerdo.ACEPTADO,
          comentario: 'Acuerdo aceptado y programado (seed inicial).',
        },
      });

      await tx.mensajeAcuerdo.create({
        data: {
          idAcuerdo: acuerdo.idAcuerdo,
          idRemitente: productor.idUsuario,
          mensaje: 'Confirmado. Lo tendré listo el jueves a las 8am.',
        },
      });
    });
  }

  console.log('✅ Seed completado:');
  console.log(`   - admin     : tel 0999999991  PIN inicial 000000 (cambiar al primer login)`);
  console.log(`   - productor : tel 0999999992  PIN inicial 0000   (cambiar al primer login)`);
  console.log(`   - comprador : tel 0999999993  PIN inicial 0000   (cambiar al primer login)`);
  console.log(`   - 3 categorías, 4 unidades, 3 puntos de entrega, 6 productos demo`);
  console.log(`   - 1 acuerdo en estado ACEPTADO listo para probar el flujo de seguimiento`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
