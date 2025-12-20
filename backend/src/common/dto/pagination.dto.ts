import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'La page doit être un nombre entier' })
    @Min(1, { message: 'La page doit être supérieure ou égale à 1' })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'La limite doit être un nombre entier' })
    @Min(1, { message: 'La limite doit être supérieure ou égale à 1' })
    limit?: number = 10;
}
