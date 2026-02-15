import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentPolymorphicDto {
    @ApiProperty({ description: 'Contenu du commentaire' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty({ description: 'ID du commentaire parent (si réponse)', required: false })
    @IsNumber()
    @IsOptional()
    commentaire_id?: number;


}
