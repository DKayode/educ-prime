import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum ConcoursSortBy {
    ANNEE = 'annee',
    TITRE = 'titre',
}

export enum ConcoursSortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class FilterConcoursDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    annee?: number;

    @IsOptional()
    @IsEnum(ConcoursSortBy)
    sort_by?: ConcoursSortBy;

    @IsOptional()
    @IsEnum(ConcoursSortOrder)
    sort_order?: ConcoursSortOrder;
}
