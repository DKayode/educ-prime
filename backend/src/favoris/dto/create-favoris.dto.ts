import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateFavoriDto {
    @ApiProperty({ description: 'ID du parcours' })
    @IsNotEmpty()
    parcours_id: number;

    @ApiProperty({ description: 'ID de l\'utilisateur' })
    @IsNotEmpty()
    utilisateur_id: number;
}