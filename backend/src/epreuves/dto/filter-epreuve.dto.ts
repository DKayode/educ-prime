import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EpreuveType } from '../entities/epreuve.entity';

export class FilterEpreuveDto extends PaginationDto {
    @IsOptional()
    @IsString()
    titre?: string;

    @IsOptional()
    @Transform(({ value }: TransformFnParams) => {
        if (!value) return undefined;
        // Capitalize first letter, lowercase the rest to match Enum values (e.g. "examens" -> "Examens")
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    })
    @IsEnum(EpreuveType, { message: 'Le type doit être une valeur valide (Interrogation, Devoirs, Concours, Examens)' })
    type?: EpreuveType;

    @IsOptional()
    @IsString()
    matiere?: string;

    @IsOptional()
    @IsString()
    search?: string;
}
