import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ForgotPinDto {
  @ApiProperty({ example: '0999999993', description: 'Teléfono registrado del usuario.' })
  @IsString()
  @Matches(/^[0-9]{8,15}$/, { message: 'Teléfono debe ser numérico, 8-15 dígitos.' })
  telefono!: string;
}
