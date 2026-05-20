import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoReporte, TipoReporte } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({ enum: TipoReporte })
  @IsEnum(TipoReporte)
  tipo!: TipoReporte;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  descripcion!: string;
}

export class ResolveIncidentDto {
  @ApiProperty({ enum: EstadoReporte })
  @IsEnum(EstadoReporte)
  estado!: EstadoReporte;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolucion?: string;
}
