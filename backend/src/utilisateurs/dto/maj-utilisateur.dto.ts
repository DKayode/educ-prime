import { IsOptional, IsString, IsEnum, IsNumber, IsDateString, IsIn } from 'class-validator';
import { RoleType, SexeType } from '../entities/utilisateur.entity';

export class MajUtilisateurDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  pseudo?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsEnum(SexeType)
  sexe?: SexeType;

  @IsOptional()
  @IsDateString()
  date_naissance?: string;

  @IsOptional()
  @IsIn(['rural', 'urbain'])
  zone_residence?: string;

  @IsOptional()
  @IsIn(['visuel', 'auditif', 'moteur', 'psychomoteur', 'aucun'])
  situation_handicap?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @IsOptional()
  @IsNumber()
  etablissement_id?: number;

  @IsOptional()
  @IsNumber()
  filiere_id?: number;

  @IsOptional()
  @IsNumber()
  niveau_etude_id?: number;
}