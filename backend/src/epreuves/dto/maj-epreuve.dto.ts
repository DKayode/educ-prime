import { IsString, IsNumber, IsOptional } from 'class-validator';

export class MajEpreuveDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  duree?: number;

  @IsOptional()
  @IsNumber()
  total_points?: number;

  @IsOptional()
  @IsString()
  matiere_id?: string;
}