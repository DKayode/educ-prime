import { IsString, IsNumber } from 'class-validator';

export class CreerFiliereDto {
  @IsString()
  nom: string;

  @IsNumber()
  etablissement_id: number;
}