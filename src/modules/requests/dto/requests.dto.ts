import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRequestDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  idProducto!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  cantidadSolicitada!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensajeInicial?: string;
}

export class RejectRequestDto {
  @ApiProperty({ description: 'Motivo del rechazo (obligatorio)' })
  @IsString()
  @MaxLength(300)
  motivo!: string;
}
