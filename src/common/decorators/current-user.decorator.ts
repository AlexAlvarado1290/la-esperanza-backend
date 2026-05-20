import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: number;
  telefono: string;
  rol: 'ADMIN' | 'PRODUCTOR' | 'COMPRADOR';
  estadoCuenta: 'ACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO';
  mustChangePin: boolean;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
