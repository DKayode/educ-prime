import { IsString, IsOptional, IsBoolean, IsEmail, IsObject } from 'class-validator';

export class CreerContactsProfessionnelDto {
    @IsString()
    nom: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    telephone?: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsObject()
    reseaux_sociaux?: any;

    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
