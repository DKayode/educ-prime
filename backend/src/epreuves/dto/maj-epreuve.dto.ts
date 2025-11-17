import { IsString, IsNumber, IsOptional, IsDate } from 'class-validator';

export class MajEpreuveDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsNumber()
  duree_minutes?: number;

  @IsOptional()
  @IsNumber()
  matiere_id?: number;

  @IsOptional()
  @IsDate()
  date_publication?: Date;
}