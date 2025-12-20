import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterConcoursDto extends PaginationDto {
    @IsOptional()
    @IsString()
    titre?: string;

    @IsOptional()
    @IsString()
    lieu?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    annee?: number;
}
