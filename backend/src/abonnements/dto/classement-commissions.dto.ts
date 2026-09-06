import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ClassementCommissionsDto {
  @ApiPropertyOptional({ example: '2026-09-01', description: 'Début de la période (inclus). Omis = depuis l’origine.' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate doit être une date ISO (AAAA-MM-JJ)' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Fin de la période (INCLUSE, journée entière).' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate doit être une date ISO (AAAA-MM-JJ)' })
  endDate?: string;

  @ApiPropertyOptional({ default: 20, description: 'Taille du classement.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Le classement est plafonné à 100 lignes' })
  limit?: number;
}
