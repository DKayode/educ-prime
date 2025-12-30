import { IsString, IsNumber, IsOptional, IsDate, IsEnum } from 'class-validator';
import { EpreuveType } from '../entities/epreuve.entity';

export class CreerEpreuveDto {
  @IsString()
  titre: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsNumber()
  duree_minutes?: number;

  @IsNumber()
  matiere_id: number;

  @IsOptional()
  @IsDate()
  date_publication?: Date;

  @IsOptional()
  @IsNumber()
  nombre_pages?: number;

  @IsOptional()
  @IsEnum(EpreuveType, { message: 'Le type doit être une valeur valide' })
  type?: EpreuveType;
}