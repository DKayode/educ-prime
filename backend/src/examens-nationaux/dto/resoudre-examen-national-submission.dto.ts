import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// Admin edit of a PENDING submission: bind a real id (clears the proposed name)
// OR overwrite a proposed name; section/année editable too. Matière and filière
// are handled independently.
export class ResoudreExamenNationalSubmissionDto {
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    type_examen_id?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString()
    proposed_type?: string;

    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    serie_id?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString()
    proposed_serie?: string;

    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    matiere_examen_id?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString()
    proposed_matiere?: string;

    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    filiere_examen_id?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString()
    proposed_filiere?: string;

    @ApiProperty({ required: false }) @IsOptional() @IsString()
    section?: string;
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    annee?: number;
}
