import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'María Esperanza Pérez' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombreCompleto?: string;

  @ApiPropertyOptional({ example: 'Aldea Las Flores, La Esperanza' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;
}
