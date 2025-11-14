import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { RoleType, SexeType } from '../entities/utilisateur.entity';

export class InscriptionDto {
  @IsString()
  nom: string;

  @IsString()
  prenom: string;

  @IsOptional()
  @IsString()
  pseudo?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  mot_de_passe: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsEnum(SexeType)
  sexe?: SexeType;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsEnum(RoleType)
  role: RoleType;

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