import { IsOptional, IsString, IsEnum, IsNumber, IsDateString, IsIn, IsUUID } from 'class-validator';
import { RoleType, SexeType, AgeGroup } from '../entities/utilisateur.entity';

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
  @IsEnum(AgeGroup, { message: "La tranche d'âge doit être une valeur valide" })
  age_group?: AgeGroup;

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

  // geo-profile: nullable uuid cascade (null clears). Validation of the
  // pays -> departement -> ville chain happens in UtilisateursService.update.
  @IsOptional()
  @IsUUID()
  departement_id?: string | null;

  @IsOptional()
  @IsUUID()
  ville_id?: string | null;

  // Type de profil (personnalisation) — nullable : null pour le retirer.
  @IsOptional()
  @IsNumber()
  type_profil_id?: number | null;
}