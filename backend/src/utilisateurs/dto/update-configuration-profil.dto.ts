import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateConfigurationProfilDto {
  @ApiPropertyOptional({
    example: 95,
    description:
      'Pourcentage exigé. Avec 16 champs comptés, 95 % équivaut à 100 % : 15/16 vaut 93,75 % ' +
      'et aucune valeur n’existe entre les deux.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le seuil doit être un entier' })
  @Min(0)
  @Max(100, { message: 'Le seuil ne peut pas dépasser 100 %' })
  seuil_completion?: number;

  @ApiPropertyOptional({ description: 'Désactivé, aucun accès n’est refusé pour profil incomplet.' })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Champs retirés du calcul.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  champs_exclus?: string[];
}
