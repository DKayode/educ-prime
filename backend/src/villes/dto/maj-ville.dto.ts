import { IsString, IsOptional, IsNumber } from 'class-validator';

export class MajVilleDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsNumber()
  departement_id?: number;
}
