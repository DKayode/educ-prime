import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreerEpreuveDto {
  @IsString()
  titre: string;

  @IsString()
  url: string;

  @IsNumber()
  duree_minutes: number;

  @IsNumber()
  matiere_id: number;

  @IsOptional()
  date_publication?: Date;
}