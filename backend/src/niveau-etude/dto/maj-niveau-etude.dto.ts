import { IsString, IsOptional } from 'class-validator';

export class MajNiveauEtudeDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  filiere_id?: string;
}