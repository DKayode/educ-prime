import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsDate } from 'class-validator';
import { RessourceType } from '../entities/ressource.entity';

export class CreerRessourceDto {
  @ApiProperty({ example: 'Introduction à l\'Algèbre', description: 'Titre de la ressource' })
  @IsString()
  titre: string;

  @ApiProperty({ description: 'URL du fichier de la ressource' })
  @IsString()
  url: string;

  @ApiProperty({ enum: RessourceType, example: RessourceType.DOCUMENT, description: 'Type de ressource' })
  @IsEnum(RessourceType)
  type: RessourceType;

  @ApiProperty({ example: 1, description: 'ID de la matière' })
  @IsNumber()
  matiere_id: number;

  @ApiProperty({ example: 10, description: 'Nombre de pages (si applicable)', required: false })
  @IsOptional()
  @IsNumber()
  nombre_pages?: number;

  @ApiProperty({ description: 'Date de publication', required: false })
  @IsOptional()
  @IsDate()
  date_publication?: Date;
}