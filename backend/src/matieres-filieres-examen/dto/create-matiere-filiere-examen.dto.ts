import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMatiereFiliereExamenDto {
    @ApiProperty({ description: "ID du type d'examen parent (scope)", example: 1 })
    @IsInt()
    type_examen_id: number;

    @ApiProperty({ description: 'Nom de la matière/filière', example: 'Mathématiques' })
    @IsString()
    @MaxLength(255)
    nom: string;

    @ApiProperty({ description: 'Description de la matière/filière', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
