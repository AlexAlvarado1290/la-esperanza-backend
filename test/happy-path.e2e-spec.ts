// E2E del happy path (RNF28 — pruebas mínimas exigidas):
//   1) login comprador
//   2) crear solicitud sobre un producto existente
//   3) login productor
//   4) aceptar la solicitud (registrar acuerdo con precio, fecha y punto)
//   5) avanzar estados ACEPTADO → PREPARANDO → PROGRAMADO → EN_RUTA → ENTREGADO_PRODUCTOR
//   6) comprador confirma la recepción (CONFIRMADO_COMPRADOR)
//   7) verifica bitácora y estado_final

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request = require('supertest');
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

async function loginAs(app: INestApplication, telefono: string, pin: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ telefono, pin })
    .expect(200);
  return res.body.access_token as string;
}

describe('Happy path comprador → acuerdo → confirmación', () => {
  let app: INestApplication;
  let server: any;
  let tokenComprador: string;
  let tokenProductor: string;
  let idSolicitud: number;
  let idAcuerdo: number;
  let idProducto: number;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['/health'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer();

    // Aprovechamos los productos del seed: tomamos uno con stock disponible.
    const producto = await prisma.producto.findFirst({
      where: { estadoProducto: 'DISPONIBLE', cantidadDisponible: { gt: 5 } },
    });
    if (!producto) throw new Error('Seed no encontrado: corre `pnpm seed` primero.');
    idProducto = producto.idProducto;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('1. login del comprador', async () => {
    tokenComprador = await loginAs(app, '0999999993', '0000');
    expect(tokenComprador).toBeTruthy();
  });

  it('2. crea una solicitud de compra', async () => {
    const res = await request(server)
      .post('/api/requests')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({
        idProducto,
        cantidadSolicitada: 3,
        mensajeInicial: 'Prueba E2E',
      })
      .expect(201);
    idSolicitud = res.body.idSolicitud;
    expect(idSolicitud).toBeGreaterThan(0);
  });

  it('3. login del productor', async () => {
    tokenProductor = await loginAs(app, '0999999992', '0000');
    expect(tokenProductor).toBeTruthy();
  });

  it('4. productor acepta la solicitud y se crea el acuerdo', async () => {
    const punto = await prisma.puntoEntrega.findFirst({ where: { estado: 'ACTIVO' } });
    if (!punto) throw new Error('No hay puntos activos en el seed');
    const fechaProgramada = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    const res = await request(server)
      .post(`/api/agreements/from-request/${idSolicitud}`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({
        precioFinal: 5,
        fechaProgramada,
        idPuntoEntrega: punto.idPuntoEntrega,
        observaciones: 'Acuerdo E2E',
      })
      .expect(201);
    idAcuerdo = res.body.idAcuerdo;
    expect(res.body.estadoAcuerdo).toBe('ACEPTADO');
  });

  it.each([
    ['PREPARANDO', 'productor'],
    ['PROGRAMADO', 'productor'],
    ['EN_RUTA', 'productor'],
    ['ENTREGADO_PRODUCTOR', 'productor'],
  ])('5. productor avanza el estado a %s', async (estado) => {
    const res = await request(server)
      .patch(`/api/agreements/${idAcuerdo}/transition`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ estado, comentario: `Transición E2E → ${estado}` })
      .expect(200);
    expect(res.body.estadoAcuerdo).toBe(estado);
  });

  it('6. el comprador confirma la recepción', async () => {
    const res = await request(server)
      .patch(`/api/agreements/${idAcuerdo}/transition`)
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({ estado: 'CONFIRMADO_COMPRADOR', comentario: 'Recibido OK' })
      .expect(200);
    expect(res.body.estadoAcuerdo).toBe('CONFIRMADO_COMPRADOR');
    expect(res.body.estadoFinal).toBe('CONFIRMADA');
  });

  it('7. la bitácora registra todas las transiciones', async () => {
    const res = await request(server)
      .get(`/api/agreements/${idAcuerdo}/tracking`)
      .set('Authorization', `Bearer ${tokenComprador}`)
      .expect(200);
    const estados = res.body.map((e: any) => e.estado);
    expect(estados).toEqual(
      expect.arrayContaining([
        'ACEPTADO',
        'PREPARANDO',
        'PROGRAMADO',
        'EN_RUTA',
        'ENTREGADO_PRODUCTOR',
        'CONFIRMADO_COMPRADOR',
      ]),
    );
  });
});
