import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// Optional resolution payload sent at approval time. When a submission named a
// proposed structure/titre, the admin (after creating or picking an existing
// one via the structure/titre CRUD) passes its id here to bind it onto the
// submission before the real concours is created. Omitted ids fall back to
// whatever the submission already carries; both must resolve or approval 400s.
export class ApproveConcoursSubmissionDto {
    @ApiProperty({ example: 5, description: 'ID de structure résolu (existant ou nouvellement créé)', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    structure_id?: number;

    @ApiProperty({ example: 6, description: 'ID de titre résolu (existant ou nouvellement créé)', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    titre_id?: number;
}
