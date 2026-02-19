import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsUrl } from 'class-validator';

export class CreerPubliciteDto {
    @ApiProperty({ example: 'Publicité Coca-Cola', description: 'Titre de la publicité' })
    @IsString()
    titre: string;

    @ApiProperty({ description: 'URL de l\'image', required: false })
    @IsOptional()
    @IsUrl()
    image?: string;

    @ApiProperty({ example: 'Image', description: 'Type de média (Image ou Video)', required: false })
    @IsOptional()
    @IsString()
    type_media?: 'Image' | 'Video';

    @ApiProperty({ description: 'URL du média', required: false })
    @IsOptional()
    @IsUrl()
    media?: string;

    @ApiProperty({ example: 1, description: 'Ordre d\'affichage', required: false })
    @IsOptional()
    @IsInt()
    ordre?: number;

    @ApiProperty({ description: 'Est actif ?', default: true, required: false })
    @IsOptional()
    @IsBoolean()
    actif?: boolean;

    @ApiProperty({ description: 'Lien d\'inscription', required: false })
    @IsOptional()
    @IsUrl()
    lien_inscription?: string;
}
