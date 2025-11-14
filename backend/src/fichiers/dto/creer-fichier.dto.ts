import { TypeFichier, TypeRessource } from '../entities/fichier.entity';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreerFichierDto {
  @IsEnum(TypeFichier)
  readonly type: TypeFichier;

  @IsEnum(TypeRessource)
  @IsOptional()
  readonly typeRessource?: TypeRessource;

  @IsNumber()
  @IsOptional()
  readonly matiereId?: number;

  @IsNumber()
  @IsOptional()
  readonly epreuveId?: number;

  @IsNumber()
  @IsOptional()
  readonly ressourceId?: number;

  // Fields for creating new epreuve
  @IsString()
  @IsOptional()
  readonly epreuveTitre?: string;

  @IsNumber()
  @IsOptional()
  readonly dureeMinutes?: number;

  // Fields for creating new ressource
  @IsString()
  @IsOptional()
  readonly ressourceTitre?: string;
}