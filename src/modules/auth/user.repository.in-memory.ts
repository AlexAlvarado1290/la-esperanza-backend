// PATRÓN: Repository (alternativa in-memory) — usada por la fábrica para tests
// unitarios que no necesitan tocar Prisma.

import { EstadoCuenta, Usuario } from '@prisma/client';
import { IUserRepository } from './user.repository';

export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<number, Usuario>();

  seed(users: Usuario[]) {
    this.users.clear();
    for (const u of users) this.users.set(u.idUsuario, u);
  }

  async findByTelefono(telefono: string) {
    return Array.from(this.users.values()).find((u) => u.telefono === telefono) ?? null;
  }

  async findById(id: number) {
    return this.users.get(id) ?? null;
  }

  async updateLoginState(
    id: number,
    data: { failedLoginAttempts?: number; lockedUntil?: Date | null },
  ) {
    const u = this.users.get(id);
    if (!u) return;
    if (data.failedLoginAttempts !== undefined) u.failedLoginAttempts = data.failedLoginAttempts;
    if (data.lockedUntil !== undefined) u.lockedUntil = data.lockedUntil;
  }

  async updatePin(id: number, pinHash: string, pinLength: number, mustChange: boolean) {
    const u = this.users.get(id);
    if (!u) return;
    u.pinHash = pinHash;
    u.pinLength = pinLength;
    u.mustChangePin = mustChange;
    u.pinChangedAt = new Date();
  }

  async updateProfile(id: number, data: { nombreCompleto?: string; direccion?: string }) {
    const u = this.users.get(id);
    if (!u) throw new Error('not found');
    if (data.nombreCompleto !== undefined) u.nombreCompleto = data.nombreCompleto;
    if (data.direccion !== undefined) u.direccion = data.direccion;
    return u;
  }

  async setEstado(id: number, estado: EstadoCuenta, motivo?: string) {
    const u = this.users.get(id);
    if (!u) throw new Error('not found');
    u.estadoCuenta = estado;
    u.motivoEstado = motivo ?? null;
    return u;
  }
}
