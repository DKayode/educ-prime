import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDate, IsEnum, IsInt } from 'class-validator';
import { EpreuveType, EpreuveSection } from '../entities/epreuve.entity';

// Body for the user-facing upload (POST /epreuves/upload). Unlike CreerEpreuveDto
// there is no `url`: the file is sent afterwards via the 2-step R2 presign flow,
// so the row is created first with an empty placeholder url. matiere_id resolves
// the full etablissement → filière → niveau chain, so callers never pass those ids.
export class UploadEpreuveDto {
  @ApiProperty({ example: 'Epreuve de Mathématiques 2023', description: "Titre de l'épreuve" })
  @IsString()
  titre: string;

  @ApiProperty({ example: 1, description: 'ID de la matière (détermine toute la chaîne)' })
  @IsNumber()
  matiere_id: number;

  @ApiProperty({ example: 2023, description: "Année de l'épreuve (fait partie de la clé anti-doublon)" })
  @IsInt()
  annee: number;

  @ApiProperty({ example: 120, description: 'Durée en minutes', required: false })
  @IsOptional()
  @IsNumber()
  duree_minutes?: number;

  @ApiProperty({ description: 'Date de publication', required: false })
  @IsOptional()
  @IsDate()
  date_publication?: Date;

  @ApiProperty({ example: 5, description: 'Nombre de pages', required: false })
  @IsOptional()
  @IsNumber()
  nombre_pages?: number;

  @ApiProperty({ enum: EpreuveType, description: "Type d'épreuve", required: false })
  @IsOptional()
  @IsEnum(EpreuveType, { message: 'Le type doit être une valeur valide' })
  type?: EpreuveType;

  @ApiProperty({ enum: EpreuveSection, description: "Session de l'épreuve", required: false })
  @IsOptional()
  @IsEnum(EpreuveSection, { message: 'La section doit être une valeur valide' })
  section?: EpreuveSection;
}
