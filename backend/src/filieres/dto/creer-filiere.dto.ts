import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreerFiliereDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  etablissement_id: number;
}