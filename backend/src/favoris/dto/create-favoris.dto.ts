import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class CreateFavoriDto {
    @ApiProperty({ description: 'ID du parcours' })
    @IsNotEmpty()
    @Type(() => Number)
    parcours_id: number;
}