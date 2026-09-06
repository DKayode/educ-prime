import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches, Max, Min, ValidateIf } from 'class-validator';
import { TypeRemise } from '../entities/code.entity';

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

  @ApiPropertyOptional({ enum: TypeRemise })
  @IsOptional()
  @IsEnum(TypeRemise)
  remise_type?: TypeRemise;

  @ApiPropertyOptional({ example: 25 })
  @ValidateIf((o) => o.remise_type !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remise_valeur?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_fin?: string;
}
