import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NombreRol } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DomainEvent } from '../events/domain-events';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<NombreRol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Sesión requerida');

    const allowed = requiredRoles.includes(user.rol);
    if (!allowed) {
      // RF39 — registrar intentos de acceso no autorizado para la auditoría.
      this.eventEmitter.emit(DomainEvent.AccesoDenegado, {
        idUsuario: user.sub,
        rolUsuario: user.rol,
        rolesRequeridos: requiredRoles,
        ruta: context.switchToHttp().getRequest().url,
      });
      throw new ForbiddenException('No autorizado para esta acción');
    }
    return true;
  }
}
