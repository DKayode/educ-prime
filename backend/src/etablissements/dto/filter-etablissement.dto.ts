import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterEtablissementDto extends PaginationDto {
    @IsOptional()
    @IsString()
    nom?: string;

    @IsOptional()
    @IsString()
    ville?: string;
}
