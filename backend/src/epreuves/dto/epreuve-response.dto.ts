import { EpreuveType } from '../entities/epreuve.entity';

export class EpreuveResponseDto {
    id: number;
    titre: string;
    url: string;
    duree_minutes: number;
    date_creation: Date;
    date_publication: Date;
    nombre_pages: number;
    nombre_telechargements: number;
    type: EpreuveType;
    professeur: {
        nom: string;
        prenom: string;
        telephone: string;
    };
    matiere: {
        id: number;
        nom: string;
        description: string;
        niveau_etude: {
            id: number;
            nom: string;
            duree_mois: number;
            filiere: {
                id: number;
                nom: string;
                etablissement_id: number;
            };
        };
    };
}
