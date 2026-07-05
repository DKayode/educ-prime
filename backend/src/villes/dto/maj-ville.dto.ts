import { IsString, IsOptional, IsUUID } from 'class-validator';

export class MajVilleDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsUUID()
  departement_id?: string;
}
