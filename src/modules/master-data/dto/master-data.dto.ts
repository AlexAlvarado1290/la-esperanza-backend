import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoMaestro } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Hortalizas' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @ApiPropertyOptional({ enum: EstadoMaestro })
  @IsOptional()
  @IsEnum(EstadoMaestro)
  estado?: EstadoMaestro;
}

export class CreateUnitDto {
  @ApiProperty({ example: 'Quintal' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string;

  @ApiProperty({ example: 'qq' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  abreviatura!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}

export class UpdateUnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  abreviatura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ enum: EstadoMaestro })
  @IsOptional()
  @IsEnum(EstadoMaestro)
  estado?: EstadoMaestro;
}

export class CreateDeliveryPointDto {
  @ApiProperty({ example: 'Centro Comunal La Esperanza' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Cómo llegar' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  referencia?: string;
}

export class UpdateDeliveryPointDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiPropertyOptional({ enum: EstadoMaestro })
  @IsOptional()
  @IsEnum(EstadoMaestro)
  estado?: EstadoMaestro;
}
