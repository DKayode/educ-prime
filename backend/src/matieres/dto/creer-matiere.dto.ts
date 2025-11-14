import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreerMatiereDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  niveau_etude_id: number;

  @IsNumber()
  filiere_id: number;
}