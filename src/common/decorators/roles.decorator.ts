import { SetMetadata } from '@nestjs/common';
import { NombreRol } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: NombreRol[]) => SetMetadata(ROLES_KEY, roles);
