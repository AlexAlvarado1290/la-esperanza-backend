import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadoCuenta, NombreRol } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { ChangeEstadoCuentaDto, CreateUserDto, UpdateUserDto } from './dto/users.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Roles(NombreRol.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'RF30 — Listar usuarios con filtros' })
  list(
    @Query('rol') rol?: NombreRol,
    @Query('estado') estado?: EstadoCuenta,
    @Query('q') q?: string,
  ) {
    return this.service.list({ rol, estado, q });
  }

  @Get(':id')
  @ApiOperation({ summary: 'RF30 — Detalle de usuario con indicadores de confiabilidad' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'RF26 — Alta de usuario (envía SMS stub con código)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'RF27 — Editar campos no identitarios (nombre, dirección)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Post(':id/reset-pin')
  @ApiOperation({ summary: 'RF28 — Reiniciar PIN del usuario (queda must_change_pin=true)' })
  resetPin(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.service.resetPin(id, user.sub);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'RF29 — Cambiar estado de cuenta (activo/suspendido/bloqueado)' })
  changeEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeEstadoCuentaDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.changeEstado(id, dto, user.sub);
  }
}
