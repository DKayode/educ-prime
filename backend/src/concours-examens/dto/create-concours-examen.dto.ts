import { IsString, IsOptional, IsBoolean, IsUrl, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ConcoursExamenType } from '../entities/concours-examen.entity';

export class CreerConcoursExamenDto {
    @IsString()
    titre: string;

    @IsEnum(ConcoursExamenType)
    type: ConcoursExamenType;

    @IsOptional()
    @IsString()
    pays?: string;

    @IsOptional()
    @IsString()
    niveau?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    date?: Date;

    @IsOptional()
    @IsString()
    lieu?: string;

    @IsOptional()
    @IsUrl()
    image?: string;

    @IsOptional()
    @IsString()
    rubriques?: string;

    @IsOptional()
    @IsString()
    fichiers_telechargeables?: string;

    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
