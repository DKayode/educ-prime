import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ActiviteQueryDto {
  @ApiPropertyOptional({
    example: 28,
    description:
      "Profondeur de la série journalière, en jours. Défaut : 28 — la heatmap du tableau de bord affiche quatre semaines.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // Borne haute : au-delà d'un an, la série cesse d'être une heatmap et
  // devient un export. Ce n'est pas ce que sert cet endpoint.
  @Max(365)
  jours?: number;
}
