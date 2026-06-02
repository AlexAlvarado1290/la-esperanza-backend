import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePinDto } from './dto/change-pin.dto';
import { ForgotPinDto } from './dto/forgot-pin.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'RF01 — Iniciar sesión con teléfono y PIN' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('forgot-pin')
  @HttpCode(200)
  @ApiOperation({
    summary: 'RF05 — Solicitar PIN temporal por SMS (autoservicio, sin login)',
  })
  forgotPin(@Body() dto: ForgotPinDto) {
    return this.auth.forgotPin(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Devuelve el usuario autenticado y su rol' })
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.me(user.sub);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'RF03 — Cerrar sesión (descarta token en el cliente)' })
  logout(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.logout(user.sub);
  }

  @ApiBearerAuth()
  @Patch('change-pin')
  @ApiOperation({ summary: 'RF04 — Cambiar PIN propio' })
  changePin(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePinDto) {
    return this.auth.changePin(user.sub, dto);
  }

  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({ summary: 'RF06 — Actualizar perfil propio (nombre, dirección)' })
  updateProfile(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.sub, dto);
  }
}
