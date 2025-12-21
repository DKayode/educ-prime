import { IsString, IsOptional, IsBoolean, IsUrl, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConcoursDto {
    @IsString()
    titre: string;

    @IsOptional()
    @IsUrl()
    url?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    annee?: number;

    @IsOptional()
    @IsString()
    lieu?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    nombre_page?: number;
}
