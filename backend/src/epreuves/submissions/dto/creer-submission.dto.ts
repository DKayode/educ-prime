import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { EpreuveSection } from '../../entities/epreuve.entity';

// STEP 1 body. Per parent level, the client sends EITHER an existing id OR a
// proposed name (when that parent doesn't exist yet); a level may be omitted
// entirely. titre is the only required field. No pays — country comes from
// @CurrentCountry()/the middleware.
export class CreerSubmissionDto {
  @ApiProperty({ required: false, description: "Id d'un établissement existant" })
  @IsOptional()
  @IsInt()
  etablissement_id?: number;

  @ApiProperty({ required: false, description: "Nom d'un établissement à créer" })
  @IsOptional()
  @IsString()
  proposed_etablissement?: string;

  @ApiProperty({ required: false, description: "Id d'une filière existante" })
  @IsOptional()
  @IsInt()
  filiere_id?: number;

  @ApiProperty({ required: false, description: "Nom d'une filière à créer" })
  @IsOptional()
  @IsString()
  proposed_filiere?: string;

  @ApiProperty({ required: false, description: "Id d'un niveau d'étude existant" })
  @IsOptional()
  @IsInt()
  niveau_etude_id?: number;

  @ApiProperty({ required: false, description: "Nom d'un niveau d'étude à créer" })
  @IsOptional()
  @IsString()
  proposed_niveau?: string;

  @ApiProperty({ required: false, description: "Id d'une matière existante" })
  @IsOptional()
  @IsInt()
  matiere_id?: number;

  @ApiProperty({ required: false, description: "Nom d'une matière à créer" })
  @IsOptional()
  @IsString()
  proposed_matiere?: string;

  @ApiProperty({ description: "Titre de l'épreuve" })
  @IsString()
  titre: string;

  @ApiProperty({ required: false, description: "Année de l'épreuve" })
  @IsOptional()
  @IsInt()
  annee?: number;

  @ApiProperty({ enum: EpreuveSection, required: false, description: "Session (défaut: normal)" })
  @IsOptional()
  @IsEnum(EpreuveSection, { message: 'La section doit être une valeur valide' })
  section?: EpreuveSection;
}
