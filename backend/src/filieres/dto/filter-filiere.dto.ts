import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterFiliereDto extends PaginationDto {
    @IsOptional()
    @IsString()
    nom?: string;
}
