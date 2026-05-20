// PATRÓN: Repository
import { Injectable } from '@nestjs/common';
import { EstadoCuenta, NombreRol, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { rol?: NombreRol; estado?: EstadoCuenta; q?: string }) {
    return this.prisma.usuario.findMany({
      where: {
        ...(filters.rol ? { rol: { nombre: filters.rol } } : {}),
        ...(filters.estado ? { estadoCuenta: filters.estado } : {}),
        ...(filters.q
          ? {
              OR: [
                { nombreCompleto: { contains: filters.q, mode: 'insensitive' } },
                { telefono: { contains: filters.q } },
                { cui: { contains: filters.q } },
              ],
            }
          : {}),
      },
      include: { rol: true },
      orderBy: { fechaRegistro: 'desc' },
    });
  }

  findByCui(cui: string) {
    return this.prisma.usuario.findUnique({ where: { cui } });
  }

  findByTelefono(telefono: string) {
    return this.prisma.usuario.findUnique({ where: { telefono } });
  }

  findRolByNombre(nombre: NombreRol) {
    return this.prisma.rol.findUnique({ where: { nombre } });
  }

  create(data: Prisma.UsuarioCreateInput) {
    return this.prisma.usuario.create({ data, include: { rol: true } });
  }

  findById(id: number) {
    return this.prisma.usuario.findUnique({ where: { idUsuario: id }, include: { rol: true } });
  }

  // Indicadores de confiabilidad (RF30).
  async indicadores(idUsuario: number) {
    const [entregadas, reportes] = await Promise.all([
      this.prisma.acuerdoComercial.count({
        where: {
          solicitud: { OR: [{ idComprador: idUsuario }, { producto: { idProductor: idUsuario } }] },
          estadoFinal: 'CONFIRMADA',
        },
      }),
      this.prisma.reporteIncidencia.count({
        where: {
          acuerdo: {
            solicitud: {
              OR: [{ idComprador: idUsuario }, { producto: { idProductor: idUsuario } }],
            },
          },
        },
      }),
    ]);
    return { entregasCompletadas: entregadas, reportesRecibidos: reportes };
  }
}
