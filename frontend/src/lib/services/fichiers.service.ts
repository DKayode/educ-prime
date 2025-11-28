import { api } from '../api';

export interface UploadEpreuveData {
    file: File;
    type: 'epreuve';
    matiereId: number;
    epreuveTitre: string;
    dureeMinutes: number;
    datePublication?: string;
}

export interface UploadRessourceData {
    file: File;
    type: 'ressource';
    typeRessource: 'Document' | 'Quiz' | 'Exercices';
    matiereId: number;
    ressourceTitre: string;
}

export const fichiersService = {
    async uploadEpreuve(data: UploadEpreuveData) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('type', data.type);
        formData.append('matiereId', data.matiereId.toString());
        formData.append('epreuveTitre', data.epreuveTitre);
        formData.append('dureeMinutes', data.dureeMinutes.toString());

        if (data.datePublication) {
            formData.append('datePublication', data.datePublication);
        }

        // Don't set Content-Type manually - browser will set it with boundary
        return api.post('/fichiers', formData);
    },

    async uploadRessource(data: UploadRessourceData) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('type', data.type);
        formData.append('typeRessource', data.typeRessource);
        formData.append('matiereId', data.matiereId.toString());
        formData.append('ressourceTitre', data.ressourceTitre);

        // Don't set Content-Type manually - browser will set it with boundary
        return api.post('/fichiers', formData);
    },
};
