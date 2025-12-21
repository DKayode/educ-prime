import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateLikeDto {
    @ApiProperty({ description: 'ID du parcours', required: false })
    @IsOptional()
    parcours_id?: number;

    @ApiProperty({ description: 'ID du commentaire', required: false })
    @IsOptional()
    commentaire_id?: number;

    @ApiProperty({ description: 'ID de l\'utilisateur' })
    @IsNotEmpty()
    utilisateur_id: number;
}