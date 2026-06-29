import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// STEP 1 of the user concours submission. The caller provides, for EACH of
// structure and titre, EITHER an existing reference id OR a proposed name for
// one that doesn't exist yet (the admin resolves proposed ones at approval).
// At least one identifier (id or name) is required per parent — enforced in
// the service. The file is uploaded separately (step 2) via the returned uuid.
export class CreateConcoursSubmissionDto {
    @ApiProperty({ example: 1, description: 'ID d\'une structure existante', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    structure_id?: number;

    @ApiProperty({ example: 'Ministère de la Santé', description: 'Nom d\'une structure à créer (si elle n\'existe pas encore)', required: false })
    @IsOptional()
    @IsString()
    proposed_structure?: string;

    @ApiProperty({ example: 1, description: 'ID d\'un titre/poste existant', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    titre_id?: number;

    @ApiProperty({ example: 'Inspecteur des impôts', description: 'Nom d\'un titre/poste à créer (si inexistant)', required: false })
    @IsOptional()
    @IsString()
    proposed_titre?: string;

    @ApiProperty({ example: 2024, description: 'Année du concours', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    annee?: number;

    @ApiProperty({ example: 'Cotonou', description: 'Lieu du concours', required: false })
    @IsOptional()
    @IsString()
    lieu?: string;
}
