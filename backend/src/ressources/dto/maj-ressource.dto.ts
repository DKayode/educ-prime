import { IsString, IsEnum, IsOptional, IsNumber, IsDate } from 'class-validator';
import { RessourceType } from '../entities/ressource.entity';

export class MajRessourceDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(RessourceType)
  type?: RessourceType;

  @IsOptional()
  @IsNumber()
  matiere_id?: number;

  @IsOptional()
  @IsDate()
  date_publication?: Date;
}