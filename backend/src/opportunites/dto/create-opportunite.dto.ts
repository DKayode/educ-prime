import { IsString, IsOptional, IsBoolean, IsUrl, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { OpportuniteType } from '../entities/opportunite.entity';

export class CreerOpportuniteDto {
    @IsString()
    titre: string;

    @IsEnum(OpportuniteType)
    type: OpportuniteType;

    @IsOptional()
    @IsString()
    organisme?: string;

    @IsOptional()
    @IsString()
    pays?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    date_limite?: Date;

    @IsOptional()
    @IsUrl()
    image?: string;

    @IsOptional()
    @IsUrl()
    lien_postuler?: string;

    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
