import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterExamenNationalDto extends PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    type_examen?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    serie?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    matiere_examen?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    filiere_examen?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    annee?: number;
}
