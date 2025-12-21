import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentaireDto {
    @ApiProperty({ description: 'ID du parcours' })
    @IsNotEmpty()
    @IsUUID()
    parcours_id: number;

    @ApiProperty({ description: 'ID de l\'utilisateur' })
    @IsNotEmpty()
    @IsUUID()
    utilisateur_id: number;

    @ApiProperty({ description: 'Contenu du commentaire' })
    @IsNotEmpty()
    contenu: string;

    @ApiProperty({ description: 'ID du commentaire parent', required: false })
    @IsOptional()
    @IsUUID()
    parent_id?: number;
}