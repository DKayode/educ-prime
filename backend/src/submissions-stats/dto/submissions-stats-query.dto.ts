import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class SubmissionsStatsQueryDto {
  @ApiPropertyOptional({ example: '2025-01-01', description: 'Début de la période (inclus). Défaut : 1970-01-01.' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Fin de la période (inclus). Défaut : aujourd’hui.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
