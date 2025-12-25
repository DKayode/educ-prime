import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateLikeDto {
    @ApiProperty({ description: 'ID du parcours', required: false })
    @IsOptional()
    @Type(() => Number)
    parcours_id?: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    utilisateur_id: number;

    @ApiProperty({ description: 'ID du commentaire', required: false })
    @IsOptional()
    @Type(() => Number)
    commentaire_id?: number;
}