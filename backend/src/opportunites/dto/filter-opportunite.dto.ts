import { IsEnum, IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OpportuniteType } from '../entities/opportunite.entity';

export enum OpportuniteSortBy {
    DATE = 'date',
    NAME = 'name',
}

export enum OpportuniteSortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class FilterOpportuniteDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(OpportuniteType)
    type?: OpportuniteType;

    @IsOptional()
    @IsEnum(OpportuniteSortBy)
    sort_by?: OpportuniteSortBy;

    @IsOptional()
    @IsEnum(OpportuniteSortOrder)
    sort_order?: OpportuniteSortOrder;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    actif?: boolean;
}
