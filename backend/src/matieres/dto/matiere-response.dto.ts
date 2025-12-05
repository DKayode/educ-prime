export class MatiereResponseDto {
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
}
