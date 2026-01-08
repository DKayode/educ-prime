import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreerEvenementDto {
    @ApiProperty({ example: 'Hackathon 2024', description: 'Titre de l\'événement' })
    @IsString()
    titre: string;

    @ApiProperty({ example: 'Une compétition de développement intense', description: 'Description de l\'événement', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Date de l\'événement', required: false })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    date?: Date;

    @ApiProperty({ example: 'Lomé', description: 'Lieu de l\'événement', required: false })
    @IsOptional()
    @IsString()
    lieu?: string;

    @ApiProperty({ description: 'Lien d\'inscription', required: false })
    @IsOptional()
    @IsUrl()
    lien_inscription?: string;

    @ApiProperty({ description: 'URL de l\'image de l\'événement', required: false })
    @IsOptional()
    @IsUrl()
    image?: string;

    @ApiProperty({ description: 'Est actif ?', default: true, required: false })
    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
