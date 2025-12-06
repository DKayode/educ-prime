import { IsString, IsOptional, IsBoolean, IsUrl, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreerEvenementDto {
    @IsString()
    titre: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    date_heure?: Date;

    @IsOptional()
    @IsString()
    lieu?: string;

    @IsOptional()
    @IsUrl()
    lien_inscription?: string;

    @IsOptional()
    @IsUrl()
    image?: string;

    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
