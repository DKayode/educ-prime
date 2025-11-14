import { IsString, IsEnum, IsOptional } from 'class-validator';
import { RessourceType } from '../entities/ressource.entity';

export class MajRessourceDto {
  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(RessourceType)
  type?: RessourceType;

  @IsOptional()
  @IsString()
  matiere_id?: string;
}