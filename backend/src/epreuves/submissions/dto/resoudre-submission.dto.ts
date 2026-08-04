import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';
import { EpreuveSection, EpreuveType } from '../../entities/epreuve.entity';

// Admin edit of a PENDING submission. For each parent level the admin may pass
// a real id (validated; the matching proposed_* name is cleared) OR overwrite
// the proposed_* name; année/section are editable too. The titre is re-derived
// server-side (matière + section + année). All fields optional — only the ones
// provided are changed.
export class ResoudreSubmissionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  etablissement_id?: number;

  @ApiProperty({ required: false, description: "Nom d'établissement proposé (si pas d'id)" })
  @IsOptional()
  @IsString()
  proposed_etablissement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  filiere_id?: number;

  @ApiProperty({ required: false, description: 'Nom de filière proposé (si pas d\'id)' })
  @IsOptional()
  @IsString()
  proposed_filiere?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  niveau_etude_id?: number;

  @ApiProperty({ required: false, description: "Nom de niveau d'étude proposé (si pas d'id)" })
  @IsOptional()
  @IsString()
  proposed_niveau?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  matiere_id?: number;

  @ApiProperty({ required: false, description: 'Nom de matière proposé (si pas d\'id)' })
  @IsOptional()
  @IsString()
  proposed_matiere?: string;

  @ApiProperty({ required: false, description: "Année de l'épreuve" })
  @IsOptional()
  @IsInt()
  annee?: number;

  @ApiProperty({ enum: EpreuveSection, required: false, description: 'Session (normal, rattrapage, …)' })
  @IsOptional()
  @IsEnum(EpreuveSection, { message: 'La section doit être une valeur valide' })
  section?: EpreuveSection;

  @ApiProperty({ enum: EpreuveType, required: false, description: "Type d'épreuve (Examens Nationaux, Examens, Concours, …)" })
  @IsOptional()
  @IsEnum(EpreuveType, { message: 'Le type doit être une valeur valide' })
  type?: EpreuveType;
}
