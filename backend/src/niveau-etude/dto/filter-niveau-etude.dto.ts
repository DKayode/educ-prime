import { IsOptional, IsString, IsArray, IsBoolean, IsInt } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Transform, Type } from 'class-transformer';

export class FilterNiveauEtudeDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    filiere?: string;

    /**
     * Identifiant de la filière. Préférable à `filiere` : le nom est comparé à
     * l'identique, et 17 filières portent une apostrophe typographique (’) que
     * les claviers remplacent par une apostrophe droite — le filtre renvoie
     * alors une liste vide, sans erreur.
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    filiere_id?: number;

    // Default: only niveaux d'étude that have at least one épreuve (via
    // matière→épreuve). Pass all=true to include empty niveaux
    // (admin management / pickers).
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    all?: boolean;
}
