import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
    @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'La page doit être un nombre entier' })
    @Min(1, { message: 'La page doit être supérieure ou égale à 1' })
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Nombre d\'éléments par page', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'La limite doit être un nombre entier' })
    @Min(1, { message: 'La limite doit être supérieure ou égale à 1' })
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Ordre de tri', enum: ['ASC', 'DESC'], default: 'ASC' })
    @IsOptional()
    sort_order?: 'ASC' | 'DESC' = 'ASC';
    @ApiPropertyOptional({ description: 'Recherche', required: false })
    @IsOptional()
    search?: string;
}
