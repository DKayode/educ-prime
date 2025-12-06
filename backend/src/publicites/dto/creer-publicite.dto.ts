import { IsString, IsOptional, IsInt, IsBoolean, IsUrl } from 'class-validator';

export class CreerPubliciteDto {
    @IsString()
    titre: string;

    @IsOptional()
    @IsUrl()
    image_video?: string;

    @IsOptional()
    @IsUrl()
    lien?: string;

    @IsOptional()
    @IsInt()
    ordre?: number;

    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
