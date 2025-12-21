import { IsString, IsOptional, IsInt, IsBoolean, IsUrl } from 'class-validator';

export class CreerPubliciteDto {
    @IsString()
    titre: string;

    @IsOptional()
    @IsUrl()
    image?: string;

    @IsOptional()
    @IsString()
    type_media?: 'Image' | 'Video';

    @IsOptional()
    @IsUrl()
    media?: string;

    @IsOptional()
    @IsInt()
    ordre?: number;

    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
