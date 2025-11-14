import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreerNiveauEtudeDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsNumber()
  duree_mois?: number;

  @IsNumber()
  filiere_id: number;
}