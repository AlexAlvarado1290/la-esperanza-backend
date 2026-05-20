import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoProducto } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Tomate roma' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  idCategoria!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  idUnidad!: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  cantidadDisponible!: number;

  @ApiProperty({ example: 4.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioReferencial!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCategoria?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idUnidad?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidadDisponible?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioReferencial?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional({ enum: EstadoProducto })
  @IsOptional()
  @IsEnum(EstadoProducto)
  estadoProducto?: EstadoProducto;
}
