import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { EstadoCuenta } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { IUserRepository } from './user.repository';
import { USER_REPOSITORY } from './user.repository.token';

interface JwtClaims {
  sub: number;
  telefono: string;
  rol: 'ADMIN' | 'PRODUCTOR' | 'COMPRADOR';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  async validate(payload: JwtClaims): Promise<CurrentUserPayload> {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (user.estadoCuenta === EstadoCuenta.BLOQUEADO) {
      throw new UnauthorizedException('Cuenta bloqueada');
    }
    return {
      sub: user.idUsuario,
      telefono: user.telefono,
      rol: payload.rol,
      estadoCuenta: user.estadoCuenta,
      mustChangePin: user.mustChangePin,
    };
  }
}
