import { IsString, IsOptional } from 'class-validator';

export class MajMatiereDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  niveau_etude_id?: string;
}