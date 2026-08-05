import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamenNationalDto {
    @ApiProperty({ description: "ID du type d'examen (BAC, CAP, Licence…)", required: true })
    @Type(() => Number)
    @IsInt()
    type_examen_id: number;

    @ApiProperty({ description: 'ID de la série (optionnelle)', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    serie_id?: number;

    // Matière et filière indépendantes et optionnelles — le service exige qu'au
    // moins l'une des deux soit fournie.
    @ApiProperty({ description: 'ID de la matière (optionnelle ; au moins matière OU filière)', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    matiere_examen_id?: number;

    @ApiProperty({ description: 'ID de la filière (optionnelle ; au moins matière OU filière)', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    filiere_examen_id?: number;

    @ApiProperty({ description: 'Section (Normal, Remplacement…)', required: false })
    @IsOptional()
    @IsString()
    section?: string;

    @ApiProperty({ description: "Année de l'examen", required: true })
    @Type(() => Number)
    @IsInt()
    annee: number;

    @ApiProperty({ description: 'Nombre de pages', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    nombre_pages?: number;
}
