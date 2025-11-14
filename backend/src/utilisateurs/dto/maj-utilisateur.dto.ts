import { IsOptional, IsString, IsEnum } from 'class-validator';
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
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @IsOptional()
  @IsString()
  etablissement_id?: string;

  @IsOptional()
  @IsString()
  filiere_id?: string;

  @IsOptional()
  @IsString()
  niveau_etude_id?: string;
}