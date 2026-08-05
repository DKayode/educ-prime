import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ApproveExamenNationalSubmissionDto {
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    type_examen_id?: number;
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    serie_id?: number;
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    matiere_examen_id?: number;
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt()
    filiere_examen_id?: number;
}

export class DeclinerExamenNationalSubmissionDto {
    @ApiProperty({ required: false, description: 'Motif du refus (envoyé à l\'auteur)' })
    @IsOptional() @IsString()
    reason?: string;
}

export class ExamenNationalSubmissionsQueryDto extends PaginationDto {
    @ApiProperty({ required: false }) @IsOptional() @IsString()
    status?: string;
}
