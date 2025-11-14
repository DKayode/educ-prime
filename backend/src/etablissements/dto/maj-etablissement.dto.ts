import { IsString, IsOptional } from 'class-validator';

export class MajEtablissementDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  adresse?: string;
}