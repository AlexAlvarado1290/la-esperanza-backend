import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '0999999991', description: 'Teléfono registrado (identificador único).' })
  @IsString()
  @Matches(/^[0-9]{8,15}$/, { message: 'Teléfono debe ser numérico, 8-15 dígitos.' })
  telefono!: string;

  @ApiProperty({ example: '1111', description: 'PIN de 4 dígitos (comprador/productor) o 6 dígitos (admin).' })
  @IsNumberString()
  @Length(4, 6)
  pin!: string;
}
