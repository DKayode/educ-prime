import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateCommissionDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Part du prix payé versée au bénéficiaire, entre 0 et 100. 0 revient à ne rien verser.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le taux doit être un nombre' })
  @Min(0, { message: 'Le taux ne peut pas être négatif' })
  @Max(100, { message: 'Le taux ne peut pas dépasser 100 %' })
  taux?: number;

  @ApiPropertyOptional({ description: 'Désactivée, aucune commission n’est versée.' })
  @IsOptional()
  @IsBoolean()
  est_active?: boolean;
}
