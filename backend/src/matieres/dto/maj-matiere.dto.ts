import { IsString, IsOptional, IsNumber } from 'class-validator';

export class MajMatiereDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  niveau_etude_id?: number;

  @IsOptional()
  @IsNumber()
  filiere_id?: number;
}