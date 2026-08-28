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

    // ATTENTION : ce commentaire décrivait une intention, jamais un
    // comportement. Aucun filtre « seulement les niveaux ayant une épreuve »
    // n'existe dans le service — `findAll` renvoie tous les niveaux du pays,
    // que ce drapeau soit passé ou non. Vérifié en production le 28 août 2026 :
    // 143 niveaux avec et sans `all=true`.
    //
    // Le champ est conservé pour ne pas rejeter par un 400 les clients qui
    // l'envoient déjà (`forbidNonWhitelisted` est actif).
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    all?: boolean;
}
