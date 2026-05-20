import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoAcuerdo, EstadoPago } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AcceptRequestDto {
  @ApiProperty({ description: 'Precio final acordado por unidad' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioFinal!: number;

  @ApiProperty({ description: 'Fecha programada de entrega (ISO)' })
  @IsDateString()
  fechaProgramada!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  idPuntoEntrega!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  observaciones?: string;
}

export class TransitionDto {
  @ApiProperty({ enum: EstadoAcuerdo })
  @IsEnum(EstadoAcuerdo)
  estado!: EstadoAcuerdo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;
}

export class CancelDto {
  @ApiProperty({ description: 'Motivo de la cancelación' })
  @IsString()
  @MaxLength(300)
  motivo!: string;
}

export class UpdatePagoDto {
  @ApiProperty({ enum: EstadoPago })
  @IsEnum(EstadoPago)
  estadoPago!: EstadoPago;
}
