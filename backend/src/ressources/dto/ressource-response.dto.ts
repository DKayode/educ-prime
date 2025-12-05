export class RessourceResponseDto {
    id: number;
    titre: string;
    type: string;
    url: string;
    date_creation: Date;
    date_publication: Date;
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
