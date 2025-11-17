import { IsString, IsOptional, IsNumber } from 'class-validator';

export class MajNiveauEtudeDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsNumber()
  duree_mois?: number;

  @IsOptional()
  @IsNumber()
  filiere_id?: number;
}