import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OpportuniteType } from '../entities/opportunite.entity';

export class FilterOpportuniteDto extends PaginationDto {
    @IsOptional()
    @IsString()
    titre?: string;

    @IsOptional()
    @IsEnum(OpportuniteType)
    type?: OpportuniteType;

    @IsOptional()
    @IsString()
    lieu?: string;

    @IsOptional()
    @IsString()
    organisme?: string;
}
