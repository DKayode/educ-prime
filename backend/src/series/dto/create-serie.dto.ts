import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSerieDto {
    @ApiProperty({ description: 'Nom de la série (A, C, D, G2…)' })
    @IsString()
    @MaxLength(255)
    nom: string;

    @ApiProperty({ description: 'Description de la série', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({ description: "ID du type d'examen parent (scope)" })
    @IsInt()
    type_examen_id: number;
}
