import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterEtablissementDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    // GET /etablissements defaults to établissements that have at least one
    // épreuve (chain épreuve→matière→niveau→filière→établissement), so the
    // mobile list never surfaces empty établissements. Pass all=true to include
    // établissements without any épreuve (admin management, parent pickers).
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    all?: boolean;
}
