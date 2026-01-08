import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDate, IsEnum } from 'class-validator';
import { EpreuveType } from '../entities/epreuve.entity';

export class CreerEpreuveDto {
  @ApiProperty({ example: 'Epreuve de Mathématiques 2023', description: 'Titre de l\'épreuve' })
  @IsString()
  titre: string;

  @ApiProperty({ description: 'URL du fichier de l\'épreuve' })
  @IsString()
  url: string;

  @ApiProperty({ example: 120, description: 'Durée en minutes', required: false })
  @IsOptional()
  @IsNumber()
  duree_minutes?: number;

  @ApiProperty({ example: 1, description: 'ID de la matière' })
  @IsNumber()
  matiere_id: number;

  @ApiProperty({ description: 'Date de publication', required: false })
  @IsOptional()
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
}