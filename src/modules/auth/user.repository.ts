// PATRÓN: Repository — encapsula el acceso Prisma a la tabla `usuario`
// para que los servicios consuman una interfaz estable (RNF26, RNF27).
// PATRÓN: Factory Method — UserRepository.factory(env) retorna implementación
// real o en memoria para tests, sin tocar a los consumidores.

import { Injectable } from '@nestjs/common';
import { EstadoCuenta, Prisma, Usuario } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface IUserRepository {
  findByTelefono(telefono: string): Promise<Usuario | null>;
  findById(id: number): Promise<Usuario | null>;
  updateLoginState(
    id: number,
    data: {
      failedLoginAttempts?: number;
      lockedUntil?: Date | null;
    },
  ): Promise<void>;
  updatePin(id: number, pinHash: string, pinLength: number, mustChange: boolean): Promise<void>;
  updateProfile(
    id: number,
    data: { nombreCompleto?: string; direccion?: string },
  ): Promise<Usuario>;
  setEstado(id: number, estado: EstadoCuenta, motivo?: string): Promise<Usuario>;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  static factory(env: string, prisma: PrismaService): IUserRepository {
    // En esta versión sólo existe la implementación Prisma; el hook queda
    // listo para devolver una InMemoryUserRepository en `test`.
    if (env === 'test-memory') {
      // import diferido para evitar cargar el stub en runtime productivo.
      const { InMemoryUserRepository } = require('./user.repository.in-memory');
      return new InMemoryUserRepository();
    }
    return new UserRepository(prisma);
  }

  findByTelefono(telefono: string) {
    return this.prisma.usuario.findUnique({
      where: { telefono },
      include: { rol: true },
    }) as unknown as Promise<Usuario | null>;
  }

  findById(id: number) {
    return this.prisma.usuario.findUnique({
      where: { idUsuario: id },
      include: { rol: true },
    }) as unknown as Promise<Usuario | null>;
  }

  async updateLoginState(
    id: number,
    data: { failedLoginAttempts?: number; lockedUntil?: Date | null },
  ): Promise<void> {
    const update: Prisma.UsuarioUpdateInput = {};
    if (data.failedLoginAttempts !== undefined) {
      update.failedLoginAttempts = data.failedLoginAttempts;
    }
    if (data.lockedUntil !== undefined) {
      update.lockedUntil = data.lockedUntil;
    }
    await this.prisma.usuario.update({ where: { idUsuario: id }, data: update });
  }

  async updatePin(
    id: number,
    pinHash: string,
    pinLength: number,
    mustChange: boolean,
  ): Promise<void> {
    await this.prisma.usuario.update({
      where: { idUsuario: id },
      data: {
        pinHash,
        pinLength,
        mustChangePin: mustChange,
        pinChangedAt: new Date(),
      },
    });
  }

  updateProfile(id: number, data: { nombreCompleto?: string; direccion?: string }) {
    return this.prisma.usuario.update({
      where: { idUsuario: id },
      data: {
        ...(data.nombreCompleto !== undefined ? { nombreCompleto: data.nombreCompleto } : {}),
        ...(data.direccion !== undefined ? { direccion: data.direccion } : {}),
      },
    });
  }

  setEstado(id: number, estado: EstadoCuenta, motivo?: string) {
    return this.prisma.usuario.update({
      where: { idUsuario: id },
      data: { estadoCuenta: estado, motivoEstado: motivo ?? null },
    });
  }
}
