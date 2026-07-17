import { IsOptional, IsString, IsArray, IsBoolean } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Transform } from 'class-transformer';

export class FilterNiveauEtudeDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    filiere?: string;

    // Default: only niveaux d'étude that have at least one épreuve (via
    // matière→épreuve). Pass all=true to include empty niveaux
    // (admin management / pickers).
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    all?: boolean;
}
