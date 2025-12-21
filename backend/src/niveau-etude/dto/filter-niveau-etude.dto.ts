import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterNiveauEtudeDto extends PaginationDto {
    @IsOptional()
    @IsString()
    nom?: string;
}
