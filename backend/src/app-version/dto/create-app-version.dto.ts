import { IsEnum, IsBoolean, IsString, IsUrl, IsOptional, Matches, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppPlatform } from '../entities/app-version.entity';

export class CreateAppVersionDto {
    @ApiProperty({ enum: AppPlatform, description: 'Plateforme (android ou ios)' })
    @IsEnum(AppPlatform)
    @IsNotEmpty()
    platform: AppPlatform;

    @ApiProperty({ example: '1.0.0', description: 'Numéro de version sémantique' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d+\.\d+\.\d+$/, { message: 'version must be in format x.y.z' })
    version: string;

    @ApiProperty({ example: '1.0.0', description: 'Version sémantique minimale requise' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d+\.\d+\.\d+$/, { message: 'minimum_required_version must be in format x.y.z' })
    minimum_required_version: string;

    @ApiProperty({ example: 'https://play.google.com/store/apps/details?id=com.example', description: 'URL du store pour la mise à jour' })
    @IsUrl()
    @IsNotEmpty()
    update_url: string;

    @ApiPropertyOptional({ default: false, description: 'Forcer la mise à jour pour cette version' })
    @IsBoolean()
    @IsOptional()
    force_update?: boolean;

    @ApiPropertyOptional({
        example: { fr: 'Mise à jour critique', en: 'Critical update' },
        description: 'Notes de version localisées'
    })
    @IsObject()
    @IsOptional()
    release_notes?: { fr?: string; en?: string };

    @ApiPropertyOptional({ default: false, description: 'Définir comme version active pour la plateforme' })
    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
