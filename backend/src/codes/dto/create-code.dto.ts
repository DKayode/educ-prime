import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsObject,
  IsOptional, IsString, Length, Matches, Min, ValidateNested,
} from 'class-validator';
import { Effet, TypeRemise } from '../entities/code-effet.entity';

/** Un effet et ses paramètres. Les paramètres sont libres : chaque effet a les siens. */
export class EffetDto {
  @ApiProperty({ enum: Effet })
  @IsEnum(Effet, { message: 'Effet inconnu' })
  effet: Effet;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  parametres?: Record<string, any>;
}

export class CreateCodeDto {
  @ApiProperty({ example: 'RENTREE2026' })
  @IsString()
  @IsNotEmpty({ message: 'Le code est requis' })
  @Length(3, 50)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Le code n’accepte que lettres, chiffres, tiret et souligné' })
  code: string;

  @ApiProperty({
    type: [Object],
    description:
      'Effets portés par le code. REDUCTION { type, valeur } · COMMISSION { taux? } · ' +
      'ABONNEMENT_OFFERT { duree_jours? }. Un code sans effet ne fait rien.',
    example: [{ effet: 'REDUCTION', parametres: { type: 'POURCENTAGE', valeur: 20 } }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EffetDto)
  effets: EffetDto[];

  @ApiPropertyOptional({ description: 'Identifiant du parrain / ambassadeur. Absent pour un code marketing.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  proprietaire_id?: number;

  @ApiPropertyOptional({ example: 'Campagne rentrée 2026' })
  @IsOptional()
  @IsString()
  @Length(0, 150)
  libelle?: string;

  @ApiPropertyOptional({ example: 100, description: 'Nombre total d’utilisations. Absent = illimité.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Le nombre d’utilisations doit être d’au moins 1' })
  usage_max_total?: number;

  @ApiPropertyOptional({ default: 1, description: 'Utilisations autorisées par personne.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_max_par_utilisateur?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'date_debut doit être une date ISO' })
  date_debut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'date_fin doit être une date ISO' })
  date_fin?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Identifiants de plans. Vide = tous les plans.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  plans_eligibles?: number[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;
}
