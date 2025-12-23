import { api } from '../api';

export interface UploadEpreuveData {
    file: File;
    type: 'epreuve';
    matiereId: number;
    epreuveTitre: string;
    epreuveType?: string;
    dureeMinutes: number;
    nombrePages?: number;
    datePublication?: string;
}

export interface UploadRessourceData {
    file: File;
    type: 'ressource';
    typeRessource: 'Document' | 'Quiz' | 'Exercices';
    matiereId: number;
    ressourceTitre: string;
    nombrePages?: number;
}

export interface UploadImageData {
    file: File;
    type: 'PUBLICITE' | 'EVENEMENT' | 'OPPORTUNITE' | 'CONCOURS' | 'ETABLISSEMENT' | 'PARCOURS';
    entityId: number;
    entitySubtype?: string; // For OPPORTUNITE: 'bourses' or 'stages', For CONCOURS_EXAMEN: 'concours' or 'examens'
}

export const fichiersService = {
    async uploadEpreuve(data: UploadEpreuveData) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('type', data.type);
        formData.append('matiereId', data.matiereId.toString());
        formData.append('epreuveTitre', data.epreuveTitre);
        formData.append('dureeMinutes', data.dureeMinutes.toString());

        if (data.nombrePages) {
            formData.append('nombrePages', data.nombrePages.toString());
        }

        if (data.epreuveType) {
            formData.append('epreuveType', data.epreuveType);
        }

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

        if (data.nombrePages) {
            formData.append('nombrePages', data.nombrePages.toString());
        }

        // Don't set Content-Type manually - browser will set it with boundary
        return api.post('/fichiers', formData);
    },

    async uploadImage(data: UploadImageData): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('type', data.type);
        formData.append('entityId', data.entityId.toString());

        if (data.entitySubtype) {
            formData.append('entitySubtype', data.entitySubtype);
        }

        // Don't set Content-Type manually - browser will set it with boundary
        return api.post<{ url: string }>('/fichiers', formData);
    },

    async deleteFile(url: string) {
        // Use DELETE method with query param as implemented in backend
        return api.delete(`/fichiers?url=${encodeURIComponent(url)}`);
    },
};
