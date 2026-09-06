import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'MENSUEL' })
  @IsString()
  @IsNotEmpty({ message: 'Le code est requis' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'Le code doit être en majuscules (A-Z, 0-9, _)' })
  @Length(2, 50)
  code: string;

  @ApiProperty({ example: 'Abonnement mensuel' })
  @IsString()
  @IsNotEmpty({ message: 'Le libellé est requis' })
  @Length(2, 150)
  libelle: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2000 })
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(0, { message: 'Le prix ne peut pas être négatif' })
  prix: number;

  @ApiPropertyOptional({ example: 'XOF', default: 'XOF' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  devise?: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1, { message: 'La durée doit être d’au moins 1 jour' })
  duree_jours: number;

  @ApiPropertyOptional({ default: false, description: 'Un plan inactif reste invisible du catalogue mobile.' })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  ordre_affichage?: number;
}
