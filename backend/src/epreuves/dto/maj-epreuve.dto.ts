import { IsString, IsNumber, IsOptional, IsDate, IsEnum, IsInt } from 'class-validator';
import { EpreuveType, EpreuveSection } from '../entities/epreuve.entity';

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

  @IsOptional()
  @IsNumber()
  nombre_pages?: number;

  @IsOptional()
  @IsEnum(EpreuveType, { message: 'Le type doit être une valeur valide' })
  type?: EpreuveType;

  @IsOptional()
  @IsInt()
  annee?: number;

  @IsOptional()
  @IsEnum(EpreuveSection, { message: 'La section doit être une valeur valide' })
  section?: EpreuveSection;
}