import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConcoursDto {
    @ApiProperty({ example: 'Concours EAMAU 2024', description: 'Titre du concours' })
    @IsString()
    titre: string;

    @ApiProperty({ description: 'URL du fichier ou lien vers le concours', required: false })
    @IsOptional()
    @IsUrl()
    url?: string;

    @ApiProperty({ example: 2024, description: 'Année du concours', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    annee?: number;

    @ApiProperty({ example: 'Lomé, Togo', description: 'Lieu du concours', required: false })
    @IsOptional()
    @IsString()
    lieu?: string;

    @ApiProperty({ example: 10, description: 'Nombre de pages', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    nombre_page?: number;
}
