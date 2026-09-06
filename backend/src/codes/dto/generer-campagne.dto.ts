import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { EffetDto } from './create-code.dto';

/** « n codes uniques à usage unique pour n personnes ». */
export class GenererCampagneDto {
  @ApiProperty({ example: 'Rentrée 2026 — influenceurs' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la campagne est requis' })
  @Length(2, 150)
  nom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000, { message: 'Une campagne est limitée à 5000 codes' })
  nombre_codes: number;

  @ApiPropertyOptional({ example: 'RENTREE', description: 'Préfixe lisible, repris dans chaque code.' })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'Le préfixe n’accepte que lettres et chiffres' })
  prefixe?: string;

  @ApiPropertyOptional({
    type: [Object],
    description: 'Effets appliqués à chaque code généré. COMMISSION est refusé : les codes d’une campagne n’ont pas de propriétaire.',
    example: [{ effet: 'REDUCTION', parametres: { type: 'MONTANT_FIXE', valeur: 500 } }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EffetDto)
  effets?: EffetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_fin?: string;
}
