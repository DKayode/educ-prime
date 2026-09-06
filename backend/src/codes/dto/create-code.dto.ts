import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, Length, Matches, Min, ValidateIf,
} from 'class-validator';
import { TypeCode, TypeRemise } from '../entities/code.entity';

export class CreateCodeDto {
  @ApiProperty({ example: 'RENTREE2026' })
  @IsString()
  @IsNotEmpty({ message: 'Le code est requis' })
  @Length(3, 50)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Le code n’accepte que lettres, chiffres, tiret et souligné' })
  code: string;

  @ApiProperty({ enum: TypeCode, example: TypeCode.REDUCTION })
  @IsEnum(TypeCode, { message: 'Type invalide' })
  type: TypeCode;

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

  @ApiPropertyOptional({ enum: TypeRemise })
  @IsOptional()
  @IsEnum(TypeRemise, { message: 'remise_type doit valoir POURCENTAGE ou MONTANT_FIXE' })
  remise_type?: TypeRemise;

  @ApiPropertyOptional({ example: 20, description: '20 = 20 % ou 20 unités selon remise_type.' })
  @ValidateIf((o) => o.remise_type !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'La valeur de remise doit être un nombre' })
  @Min(0)
  remise_valeur?: number;

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
