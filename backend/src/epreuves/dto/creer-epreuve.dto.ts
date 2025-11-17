import { IsString, IsNumber, IsOptional, IsDate } from 'class-validator';

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
  @IsDate()
  date_publication?: Date;
}