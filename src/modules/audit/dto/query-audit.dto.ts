import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAuditDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entidad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idUsuario?: number;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsString()
  desde?: string;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsString()
  hasta?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: 100, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;
}
