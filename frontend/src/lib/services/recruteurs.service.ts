import { api } from '../api';

export interface RecruteurItem {
    id: number;
    numero_ifu: string | null;
    nom: string;
    nom_recruteur: string;
    prenom: string;
    utilisateur_id: number;
    photo_profil: string | null;
    photo_identite: string | null;
    adresse: string | null;
    telephone: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    utilisateurs?: {
        id: number;
        email: string;
        nom: string;
        prenom: string;
    };
}

export const recruteursService = {
    getAll: async () => {
        const data = await api.get<RecruteurItem[]>('/recruteurs');
        // Ensure we always return an array
        return Array.isArray(data) ? data : [];
    },

    getAllAdmin: async () => {
        // Requires admin token
        const data = await api.get<RecruteurItem[]>('/recruteurs/all');
        return Array.isArray(data) ? data : [];
    },

    getProfile: async () => {
        const data = await api.get<RecruteurItem>('/recruteurs/profil');
        return data;
    },

    updateStatus: async (id: number, status: string) => {
        const data = await api.put(`/recruteurs/${id}/status`, { status });
        return data as any;
    },
};
