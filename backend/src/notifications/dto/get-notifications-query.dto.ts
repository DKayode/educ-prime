import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetNotificationsQueryDto {
    @ApiProperty({
        required: false,
        description: 'Titre de la notification (recherche partielle)'
    })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({
        required: false,
        description: 'Corps de la notification (recherche partielle)'
    })
    @IsString()
    @IsOptional()
    body?: string;

    @ApiProperty({
        required: false,
        default: 1,
        description: 'Numéro de page'
    })
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @ApiProperty({
        required: false,
        default: 20,
        description: 'Nombre d\'éléments par page'
    })
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;
}