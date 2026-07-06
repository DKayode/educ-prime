import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDate, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { EpreuveType, EpreuveSection } from '../entities/epreuve.entity';

export class CreerEpreuveDto {
  @ApiProperty({ example: 'Epreuve de Mathématiques 2023', description: 'Titre de l\'épreuve' })
  @IsString()
  titre: string;

  // Optional: the row is created BEFORE the PDF exists — the file is uploaded
  // afterwards via /files/epreuves/:uuid/file, which (TRANSITIONAL dual-write)
  // backfills epreuves.url. Seeded to '' until then.
  @ApiProperty({ description: "URL du fichier de l'épreuve", required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ example: 120, description: 'Durée en minutes', required: false })
  @IsOptional()
  @IsNumber()
  duree_minutes?: number;

  @ApiProperty({ example: 1, description: 'ID de la matière' })
  @IsNumber()
  matiere_id: number;

  @ApiProperty({ description: 'Date de publication (ISO / datetime-local)', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_publication?: Date;

  @ApiProperty({ example: 5, description: 'Nombre de pages', required: false })
  @IsOptional()
  @IsNumber()
  nombre_pages?: number;

  @ApiProperty({ enum: EpreuveType, description: 'Type d\'épreuve', required: false })
  @IsOptional()
  @IsEnum(EpreuveType, { message: 'Le type doit être une valeur valide' })
  type?: EpreuveType;

  @ApiProperty({ example: 2023, description: 'Année de l\'épreuve', required: false })
  @IsOptional()
  @IsInt()
  annee?: number;

  @ApiProperty({ enum: EpreuveSection, description: 'Session de l\'épreuve', required: false })
  @IsOptional()
  @IsEnum(EpreuveSection, { message: 'La section doit être une valeur valide' })
  section?: EpreuveSection;
}