import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentaireDto {
    @ApiProperty({ description: 'ID du parcours' })
    @IsNotEmpty()
    @IsInt()
    parcours_id: number;

    @ApiProperty({ description: 'Contenu du commentaire' })
    @IsNotEmpty()
    contenu: string;

    @ApiProperty({ description: 'ID du commentaire parent', required: false })
    @IsOptional()
    @IsInt()
    parent_id?: number;
}