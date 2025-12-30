import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum EvenementSortBy {
    DATE = 'date',
    NAME = 'name',
}

export class FilterEvenementDto extends PaginationDto {
    @ApiPropertyOptional({ description: 'Terme de recherche (titre ou lieu)' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: EvenementSortBy, description: 'Trier par (date ou nom)' })
    @IsOptional()
    @IsEnum(EvenementSortBy)
    sort_by?: EvenementSortBy;

    @ApiPropertyOptional({ description: 'Filtrer par statut actif (true/false)' })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    actif?: boolean;
}
