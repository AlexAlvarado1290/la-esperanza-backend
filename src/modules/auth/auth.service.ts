import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { EstadoCuenta, NombreRol, Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DomainEvent } from '../../common/events/domain-events';
import { LoginDto } from './dto/login.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { IUserRepository } from './user.repository';
import { USER_REPOSITORY } from './user.repository.token';

type UsuarioConRol = Usuario & { rol: { nombre: NombreRol } };

@Injectable()
export class AuthService {
  private readonly maxAttempts: number;
  private readonly lockMinutes: number;
  private readonly bcryptRounds: number;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {
    this.maxAttempts = Number(this.config.get('MAX_LOGIN_ATTEMPTS') ?? 5);
    this.lockMinutes = Number(this.config.get('LOGIN_LOCK_MINUTES') ?? 10);
    this.bcryptRounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 10);
  }

  // RF01 — Iniciar sesión con teléfono y PIN
  async login(dto: LoginDto) {
    const user = (await this.users.findByTelefono(dto.telefono)) as UsuarioConRol | null;
    if (!user) {
      // Mensaje genérico sin revelar campo (RF01 — excepciones).
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // RNF10 — bloqueo temporal por intentos fallidos
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutosRestantes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutosRestantes} min.`,
      );
    }

    if (user.estadoCuenta === EstadoCuenta.BLOQUEADO) {
      throw new UnauthorizedException(
        'Cuenta bloqueada. Contacta a la Asociación para reactivarla.',
      );
    }

    const ok = await bcrypt.compare(dto.pin, user.pinHash);
    if (!ok) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const updates: { failedLoginAttempts: number; lockedUntil?: Date | null } = {
        failedLoginAttempts: attempts,
      };
      if (attempts >= this.maxAttempts) {
        updates.lockedUntil = new Date(Date.now() + this.lockMinutes * 60_000);
        updates.failedLoginAttempts = 0;
      }
      await this.users.updateLoginState(user.idUsuario, updates);
      this.events.emit(DomainEvent.LoginFallido, {
        idUsuario: user.idUsuario,
        accion: 'login.fallido',
        entidad: 'usuario',
        entidadId: String(user.idUsuario),
        metadata: { attempts },
      });
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Login exitoso: reseteamos el contador.
    await this.users.updateLoginState(user.idUsuario, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const token = await this.jwt.signAsync({
      sub: user.idUsuario,
      telefono: user.telefono,
      rol: user.rol.nombre,
    });

    this.events.emit(DomainEvent.LoginExitoso, {
      idUsuario: user.idUsuario,
      accion: 'login.exitoso',
      entidad: 'usuario',
      entidadId: String(user.idUsuario),
    });

    return {
      access_token: token,
      user: this.toPublicUser(user),
    };
  }

  // RF04 — Cambiar PIN propio
  async changePin(userId: number, dto: ChangePinDto) {
    const user = (await this.users.findById(userId)) as UsuarioConRol | null;
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const ok = await bcrypt.compare(dto.currentPin, user.pinHash);
    if (!ok) throw new BadRequestException('PIN actual incorrecto');

    if (dto.currentPin === dto.newPin) {
      throw new BadRequestException('El PIN nuevo debe ser distinto al actual');
    }

    // RNF13 — admins usan PIN de 6 dígitos; el resto, 4.
    const requiredLength = user.rol.nombre === NombreRol.ADMIN ? 6 : 4;
    if (dto.newPin.length !== requiredLength) {
      throw new BadRequestException(
        `El PIN debe tener exactamente ${requiredLength} dígitos para el rol ${user.rol.nombre}.`,
      );
    }
    if (!/^\d+$/.test(dto.newPin)) {
      throw new BadRequestException('El PIN debe ser numérico');
    }

    const hash = await bcrypt.hash(dto.newPin, this.bcryptRounds);
    await this.users.updatePin(user.idUsuario, hash, requiredLength, false);

    this.events.emit(DomainEvent.PinCambiado, {
      idUsuario: user.idUsuario,
      accion: 'pin.cambiado',
      entidad: 'usuario',
      entidadId: String(user.idUsuario),
    });

    return { message: 'PIN actualizado correctamente' };
  }

  // RF06 — Gestionar perfil propio
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    if (dto.nombreCompleto === undefined && dto.direccion === undefined) {
      throw new BadRequestException('Nada que actualizar');
    }
    const updated = await this.users.updateProfile(userId, dto);
    this.events.emit(DomainEvent.UsuarioEditado, {
      idUsuario: userId,
      accion: 'perfil.actualizado',
      entidad: 'usuario',
      entidadId: String(userId),
      valorDespues: { nombreCompleto: dto.nombreCompleto, direccion: dto.direccion },
    });
    const withRol = (await this.users.findById(userId)) as UsuarioConRol;
    return this.toPublicUser({ ...updated, rol: withRol.rol });
  }

  // RF03 — el logout es client-side (descarta el token); el endpoint solo audita.
  async logout(userId: number) {
    this.events.emit(DomainEvent.LoginExitoso, {
      idUsuario: userId,
      accion: 'logout',
      entidad: 'usuario',
      entidadId: String(userId),
    });
    return { message: 'Sesión cerrada' };
  }

  async me(userId: number) {
    const user = (await this.users.findById(userId)) as UsuarioConRol | null;
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return this.toPublicUser(user);
  }

  // Suspendidos pueden iniciar sesión pero no operar (RF29). El guard de
  // operación (no de login) usa este helper.
  ensureCuentaPuedeOperar(user: { estadoCuenta: EstadoCuenta }) {
    if (user.estadoCuenta !== EstadoCuenta.ACTIVO) {
      throw new ForbiddenException(
        'Tu cuenta está suspendida o bloqueada. Contacta a la Asociación.',
      );
    }
  }

  private toPublicUser(u: UsuarioConRol) {
    return {
      idUsuario: u.idUsuario,
      telefono: u.telefono,
      nombreCompleto: u.nombreCompleto,
      direccion: u.direccion,
      rol: u.rol.nombre,
      estadoCuenta: u.estadoCuenta,
      mustChangePin: u.mustChangePin,
      pinLength: u.pinLength,
    };
  }
}
