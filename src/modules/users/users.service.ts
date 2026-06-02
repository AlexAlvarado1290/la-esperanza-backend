import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoCuenta, NombreRol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SMS_ADAPTER, SmsAdapter } from '../../common/adapters/sms.adapter';
import { DomainEvent } from '../../common/events/domain-events';
import { IUserRepository } from '../auth/user.repository';
import { USER_REPOSITORY } from '../auth/user.repository.token';
import { UsersAdminRepository } from './users-admin.repository';
import { ChangeEstadoCuentaDto, CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly admin: UsersAdminRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(SMS_ADAPTER) private readonly sms: SmsAdapter,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {
    this.bcryptRounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 10);
  }

  // Elimina campos sensibles antes de devolver al cliente (RNF11): hash del PIN,
  // contador de intentos fallidos y timestamp de bloqueo no deben salir nunca.
  private toPublic<T extends { pinHash?: string; failedLoginAttempts?: number; lockedUntil?: Date | null }>(
    u: T,
  ): Omit<T, 'pinHash' | 'failedLoginAttempts' | 'lockedUntil'> {
    const { pinHash: _pinHash, failedLoginAttempts: _f, lockedUntil: _l, ...safe } = u;
    return safe;
  }

  async list(filters: { rol?: NombreRol; estado?: EstadoCuenta; q?: string }) {
    const items = await this.admin.list(filters);
    return items.map((u) => this.toPublic(u));
  }

  async findOne(id: number) {
    const u = await this.admin.findById(id);
    if (!u) throw new NotFoundException('Usuario no encontrado');
    const ind = await this.admin.indicadores(id);
    return { ...this.toPublic(u), indicadores: ind };
  }

  // RF26 — Registrar nuevo usuario.
  async create(dto: CreateUserDto, actorId: number) {
    if (await this.admin.findByCui(dto.cui))
      throw new BadRequestException('CUI/DPI ya registrado.');
    if (await this.admin.findByTelefono(dto.telefono))
      throw new BadRequestException('Teléfono ya registrado.');

    const rol = await this.admin.findRolByNombre(dto.rol);
    if (!rol) throw new BadRequestException('Rol no encontrado.');

    // RNF13 — admin con PIN de 6 dígitos. Resto con 4.
    const pinLength = dto.rol === NombreRol.ADMIN ? 6 : 4;
    const initialPin = '0'.repeat(pinLength);
    const pinHash = await bcrypt.hash(initialPin, this.bcryptRounds);

    const created = await this.admin.create({
      cui: dto.cui,
      nombreCompleto: dto.nombreCompleto,
      telefono: dto.telefono,
      direccion: dto.direccion ?? null,
      pinHash,
      pinLength,
      mustChangePin: true,
      rol: { connect: { idRol: rol.idRol } },
    });

    // RF26 — Notificar al usuario con su PIN inicial para que pueda iniciar
    // sesión por primera vez. El SmsAdapter es intercambiable (stub | smartla).
    await this.sms.sendVerificationCode(dto.telefono, initialPin, 'alta_usuario');

    this.events.emit(DomainEvent.UsuarioCreado, {
      idUsuario: actorId,
      accion: 'usuario.creado',
      entidad: 'usuario',
      entidadId: String(created.idUsuario),
      valorDespues: { ...created, pinHash: undefined },
      metadata: { idUsuario: created.idUsuario },
    });

    return {
      ...this.toPublic(created),
      pinInicial: initialPin, // visible solo para admin durante el alta
      mensajeSms: `Se envió un SMS a ${dto.telefono} con el PIN inicial (${initialPin}).`,
    };
  }

  // RF27 — Editar usuario.
  async update(id: number, dto: UpdateUserDto, actorId: number) {
    const existing = await this.admin.findById(id);
    if (!existing) throw new NotFoundException('Usuario no encontrado');
    const updated = await this.users.updateProfile(id, dto);
    this.events.emit(DomainEvent.UsuarioEditado, {
      idUsuario: actorId,
      accion: 'usuario.editado',
      entidad: 'usuario',
      entidadId: String(id),
      valorAntes: { nombreCompleto: existing.nombreCompleto, direccion: existing.direccion },
      valorDespues: { nombreCompleto: updated.nombreCompleto, direccion: updated.direccion },
    });
    return this.toPublic(updated);
  }

  // RF28 — Reiniciar PIN.
  async resetPin(id: number, actorId: number) {
    const target = await this.admin.findById(id);
    if (!target) throw new NotFoundException('Usuario no encontrado');
    if (target.estadoCuenta === EstadoCuenta.BLOQUEADO) {
      throw new BadRequestException('No se puede reiniciar el PIN de una cuenta bloqueada.');
    }
    const pinLength = target.rol.nombre === NombreRol.ADMIN ? 6 : 4;
    const initialPin = '0'.repeat(pinLength);
    const hash = await bcrypt.hash(initialPin, this.bcryptRounds);
    await this.users.updatePin(id, hash, pinLength, true);

    await this.sms.sendNotification(
      target.telefono,
      `Tu PIN fue reiniciado por la Asociación. Inicia sesión con ${initialPin} y cámbialo.`,
    );

    this.events.emit(DomainEvent.UsuarioPinReiniciado, {
      idUsuario: actorId,
      accion: 'usuario.pin.reiniciado',
      entidad: 'usuario',
      entidadId: String(id),
      metadata: { idUsuario: id },
    });

    return { message: 'PIN reiniciado', pinInicial: initialPin };
  }

  // RF29 — Cambiar estado de cuenta.
  async changeEstado(id: number, dto: ChangeEstadoCuentaDto, actorId: number) {
    const target = await this.admin.findById(id);
    if (!target) throw new NotFoundException('Usuario no encontrado');
    if (
      (dto.estado === EstadoCuenta.SUSPENDIDO || dto.estado === EstadoCuenta.BLOQUEADO) &&
      !dto.motivo
    ) {
      throw new BadRequestException('Motivo obligatorio al suspender o bloquear.');
    }
    const updated = await this.users.setEstado(id, dto.estado, dto.motivo);
    this.events.emit(DomainEvent.UsuarioEstadoCambiado, {
      idUsuario: actorId,
      accion: 'usuario.estado.cambiado',
      entidad: 'usuario',
      entidadId: String(id),
      valorAntes: { estado: target.estadoCuenta },
      valorDespues: { estado: dto.estado, motivo: dto.motivo },
      metadata: { idUsuario: id, estado: dto.estado },
    });
    return this.toPublic(updated);
  }
}
