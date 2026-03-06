import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { services_status_enum } from '@prisma/client';

export class CreateServiceDto {
    @ApiProperty({ description: 'Titre du service', example: 'Développement d\'une application web' })
    @IsString()
    @IsNotEmpty()
    titre: string;

    @ApiProperty({ description: 'Description détaillée du service', example: 'Je vais développer une application web complète...' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Localisation géographique', example: 'Paris, France' })
    @IsString()
    @IsNotEmpty()
    localisation: string;

    @ApiPropertyOptional({ description: 'Prix du service en FCFA', example: 50000 })
    @IsNumber()
    @IsOptional()
    prix?: number;

    @ApiPropertyOptional({ description: 'ID du type de service', example: 1 })
    @IsNumber()
    @IsOptional()
    type_id?: number;

    @ApiPropertyOptional({ description: 'Slug du type de service (à la place de type_id)', example: 'developpement-web' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ description: 'Délai de réalisation en jours', example: 7 })
    @IsNumber()
    @IsOptional()
    delai?: number;

    @ApiPropertyOptional({ description: 'Description de ce qui sera livré', example: 'Code source et documentation' })
    @IsString()
    @IsOptional()
    livrable?: string;

    @ApiPropertyOptional({ description: 'URL de l\'image de couverture', example: 'https://example.com/image.jpg' })
    @IsString()
    @IsOptional()
    image_couverture?: string;
}

export class UpdateServiceDto {
    @ApiPropertyOptional({ description: 'Titre du service', example: 'Développement d\'une application web' })
    @IsString()
    @IsOptional()
    titre?: string;

    @ApiPropertyOptional({ description: 'Description détaillée du service', example: 'Je vais développer une application web complète...' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Localisation géographique', example: 'Paris, France' })
    @IsString()
    @IsOptional()
    localisation?: string;

    @ApiPropertyOptional({ description: 'Prix du service en FCFA', example: 50000 })
    @IsNumber()
    @IsOptional()
    prix?: number;

    @ApiPropertyOptional({ description: 'ID du type de service', example: 1 })
    @IsNumber()
    @IsOptional()
    type_id?: number;

    @ApiPropertyOptional({ description: 'Slug du type de service (à la place de type_id)', example: 'developpement-web' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ description: 'Délai de réalisation en jours', example: 7 })
    @IsNumber()
    @IsOptional()
    delai?: number;

    @ApiPropertyOptional({ description: 'Description de ce qui sera livré', example: 'Code source et documentation' })
    @IsString()
    @IsOptional()
    livrable?: string;
}

export class UpdateServiceStatusDto {
    @ApiProperty({ description: 'Nouveau statut du service', enum: services_status_enum, example: services_status_enum.approved })
    @IsEnum(services_status_enum)
    @IsNotEmpty()
    status: services_status_enum;
}
