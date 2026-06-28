import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// Body for the public (any authenticated user) concours upload. The free-text
// `titre` is always server-composed from the referenced structure + titre, so
// it is intentionally NOT accepted here. structure_id, titre_id and annee are
// required — they form the (structure, titre, annee) duplicate-check tuple.
export class UploadConcoursDto {
    @ApiProperty({ example: 1, description: 'ID de la structure organisatrice (référence, requis)' })
    @Type(() => Number)
    @IsNumber()
    structure_id: number;

    @ApiProperty({ example: 1, description: 'ID du titre/poste recherché (référence, requis)' })
    @Type(() => Number)
    @IsNumber()
    titre_id: number;

    @ApiProperty({ example: 2024, description: 'Année du concours (requis)' })
    @Type(() => Number)
    @IsNumber()
    annee: number;

    @ApiProperty({ example: 'Lomé, Togo', description: 'Lieu du concours', required: false })
    @IsOptional()
    @IsString()
    lieu?: string;

    @ApiProperty({ description: 'URL du fichier ou lien vers le concours', required: false })
    @IsOptional()
    @IsUrl()
    url?: string;

    @ApiProperty({ example: 10, description: 'Nombre de pages', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    nombre_page?: number;
}
