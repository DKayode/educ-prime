import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterFiliereDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    etablissement?: string;

    // Default: only filières that have at least one épreuve (via
    // niveau→matière→épreuve). Pass all=true to include empty filières
    // (admin management / pickers).
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    all?: boolean;
}
