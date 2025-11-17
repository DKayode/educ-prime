import { IsString, IsOptional } from 'class-validator';

export class MajEtablissementDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  ville?: string;

  @IsOptional()
  @IsString()
  code_postal?: string;
}