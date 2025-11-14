import { IsString, IsOptional, IsNumber } from 'class-validator';

export class MajFiliereDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  etablissement_id?: number;
}