import { api } from '../api';

export interface Evenement {
    id: number;
    titre: string;
    description?: string;
    date_heure?: string;
    lieu?: string;
    lien_inscription?: string;
    image?: string;
    actif: boolean;
    date_creation: string;
}

export const evenementsService = {
    async getAll(): Promise<Evenement[]> {
        return api.get<Evenement[]>('/evenements');
    },

    async getById(id: string): Promise<Evenement> {
        return api.get<Evenement>(`/evenements/${id}`);
    },

    async create(data: {
        titre: string;
        description?: string;
        date_heure?: string;
        lieu?: string;
        lien_inscription?: string;
        image?: string;
        actif?: boolean;
    }): Promise<Evenement> {
        return api.post<Evenement>('/evenements', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        description: string;
        date_heure: string;
        lieu: string;
        lien_inscription: string;
        image: string;
        actif: boolean;
    }>): Promise<Evenement> {
        return api.put<Evenement>(`/evenements/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/evenements/${id}`);
    },
};
