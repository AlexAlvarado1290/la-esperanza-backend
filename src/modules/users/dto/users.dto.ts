import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoCuenta, NombreRol } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: '1234567890101', description: 'CUI / DPI (único).' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  cui!: string;

  @ApiProperty({ example: 'Juan Pérez González' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombreCompleto!: string;

  @ApiProperty({ example: '0987654321', description: 'Teléfono único, identificador de login.' })
  @IsString()
  @Matches(/^[0-9]{8,15}$/, { message: 'Teléfono debe ser numérico 8-15 dígitos.' })
  telefono!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @ApiProperty({ enum: NombreRol })
  @IsEnum(NombreRol)
  rol!: NombreRol;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombreCompleto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;
}

export class ChangeEstadoCuentaDto {
  @ApiProperty({ enum: EstadoCuenta })
  @IsEnum(EstadoCuenta)
  estado!: EstadoCuenta;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
