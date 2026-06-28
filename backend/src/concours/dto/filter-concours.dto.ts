import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';

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

    // Admin-only filter to list a specific status (e.g. pending_approval).
    // Ignored for non-admin callers, who are always forced to approved-only.
    @IsOptional()
    @IsEnum(ServiceStatusEnum)
    status?: ServiceStatusEnum;
}
