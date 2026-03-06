import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { services_status_enum } from '@prisma/client';

export class CreateOffreDto {
    @ApiProperty({ description: 'Titre de l\'offre', example: 'Recherche développeur React' })
    @IsString()
    @IsNotEmpty()
    titre: string;

    @ApiProperty({ description: 'Description détaillée de l\'offre', example: 'Nous recherchons un développeur pour un projet de 3 mois...' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiPropertyOptional({ description: 'ID du type de l\'offre', example: 1 })
    @IsNumber()
    @IsOptional()
    type_id?: number;

    @ApiPropertyOptional({ description: 'Slug du type de l\'offre (à la place de type_id)', example: 'emploi-cdi' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ description: 'Budget ou prix de l\'offre en FCFA', example: 150000 })
    @IsNumber()
    @IsOptional()
    prix?: number;

    @ApiPropertyOptional({ description: 'Durée ou temps nécessaire', example: '3 mois' })
    @IsString()
    @IsOptional()
    temps?: string;

    @ApiPropertyOptional({ description: 'Image de couverture pour l\'offre', example: 'https://example.com/image.jpg' })
    @IsString()
    @IsOptional()
    image_couverture?: string;

    @ApiPropertyOptional({ description: 'Liste des identifiants (slugs) des compétences', example: ['reactjs', 'nodejs'] })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    competences?: string[];
}

export class UpdateOffreDto {
    @ApiPropertyOptional({ description: 'Titre de l\'offre', example: 'Recherche développeur React' })
    @IsString()
    @IsOptional()
    titre?: string;

    @ApiPropertyOptional({ description: 'Description détaillée de l\'offre', example: 'Nous recherchons un développeur pour un projet de 3 mois...' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'ID du type de l\'offre', example: 1 })
    @IsNumber()
    @IsOptional()
    type_id?: number;

    @ApiPropertyOptional({ description: 'Slug du type de l\'offre (à la place de type_id)', example: 'emploi-cdi' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ description: 'Budget ou prix de l\'offre en FCFA', example: 150000 })
    @IsNumber()
    @IsOptional()
    prix?: number;

    @ApiPropertyOptional({ description: 'Durée ou temps nécessaire', example: '3 mois' })
    @IsString()
    @IsOptional()
    temps?: string;

    @ApiPropertyOptional({ description: 'Liste des identifiants (slugs) des compétences', example: ['reactjs', 'nodejs'] })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    competences?: string[];
}

export class UpdateOffreStatusDto {
    @ApiProperty({ description: 'Nouveau statut de l\'offre', enum: services_status_enum, example: services_status_enum.approved })
    @IsNotEmpty()
    @IsEnum(services_status_enum)
    status: services_status_enum;
}
