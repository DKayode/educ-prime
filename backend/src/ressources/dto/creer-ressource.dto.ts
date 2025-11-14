import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { RessourceType } from '../entities/ressource.entity';

export class CreerRessourceDto {
  @IsString()
  titre: string;

  @IsString()
  url: string;

  @IsEnum(RessourceType)
  type: RessourceType;

  @IsNumber()
  matiere_id: number;

  @IsOptional()
  date_publication?: Date;
}