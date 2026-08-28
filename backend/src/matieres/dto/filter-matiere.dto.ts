import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterMatiereDto extends PaginationDto {
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

    /**
     * Identifiant du niveau d'étude. Le parcours de dépôt est
     * établissement -> filière -> niveau -> matière : sans ce filtre, l'écran
     * ne pouvait demander que les matières de TOUTE la filière, tous niveaux
     * confondus — 68 pour Médecine Générale, dont seules 10 remontaient.
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    niveau_etude_id?: number;
}
