import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RessourceType } from '../entities/ressource.entity';

export class FilterRessourceDto extends PaginationDto {
    @IsOptional()
    @IsString()
    titre?: string;

    @IsOptional()
    @Transform(({ value }: TransformFnParams) => {
        if (!value) return undefined;
        // Capitalize first letter, lowercase the rest to match Enum values (e.g. "document" -> "Document")
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    })
    @IsEnum(RessourceType, { message: 'Le type doit être une valeur valide (Quiz, Exercices, Document)' })
    type?: RessourceType;

    @IsOptional()
    @IsString()
    matiere?: string;
}
