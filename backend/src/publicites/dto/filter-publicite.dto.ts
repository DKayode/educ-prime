import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterPubliciteDto extends PaginationDto {
    @IsOptional()
    @IsString()
    titre?: string;
}
