import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches } from 'class-validator';

export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
}

export class CreateParcourDto {
    @ApiProperty({ description: 'Titre du parcours' })
    @IsNotEmpty()
    @IsString()
    titre: string;

    @ApiProperty({ description: 'L\'image de couverture', required: false })
    @IsOptional()
    @IsUrl()
    image_couverture?: string;

    @ApiProperty({ description: 'URL de la vidéo', required: false })
    @IsOptional()
    @IsUrl()
    lien_media?: string;

    @ApiProperty({ enum: MediaType, description: 'Type de média' })
    @IsEnum(MediaType)
    type_media: MediaType;

    @ApiProperty({ description: 'Catégorie du parcours' })
    @IsOptional()
    @IsString()
    categorie: string;

    @ApiProperty({ description: 'id catégirie du parcours' })
    @IsNotEmpty()
    @IsInt()
    category_id: number;

    @ApiProperty({ description: 'Description détaillée' })
    @IsNotEmpty()
    @IsString()
    description: string;
}