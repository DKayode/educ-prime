export class NiveauEtudeResponseDto {
    id: number;
    nom: string;
    duree_mois: number;
    filiere: {
        id: number;
        nom: string;
        etablissement_id: number;
    };
}
