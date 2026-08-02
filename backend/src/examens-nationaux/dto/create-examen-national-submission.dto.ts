import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// Any authenticated user submits a national exam. For each classifying level
// supply an existing id OR a proposed free-text name (admin resolves it).
export class CreateExamenNationalSubmissionDto {
    @ApiProperty({ required: false })
    @IsOptional() @Type(() => Number) @IsInt()
    type_examen_id?: number;

    @ApiProperty({ required: false, description: "Nom du type proposé (si pas d'id)" })
    @IsOptional() @IsString()
    proposed_type?: string;

    @ApiProperty({ required: false })
    @IsOptional() @Type(() => Number) @IsInt()
    serie_id?: number;

    @ApiProperty({ required: false, description: 'Nom de série proposé (si pas d\'id)' })
    @IsOptional() @IsString()
    proposed_serie?: string;

    @ApiProperty({ required: false })
    @IsOptional() @Type(() => Number) @IsInt()
    matiere_filiere_examen_id?: number;

    @ApiProperty({ required: false, description: 'Nom de matière/filière proposé (si pas d\'id)' })
    @IsOptional() @IsString()
    proposed_matiere_filiere?: string;

    @ApiProperty({ required: false })
    @IsOptional() @IsString()
    section?: string;

    @ApiProperty({ required: false })
    @IsOptional() @Type(() => Number) @IsInt()
    annee?: number;
}
