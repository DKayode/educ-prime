import { api } from '../api';

export type OpportuniteType = 'Bourses' | 'Stages';

export interface Opportunite {
    id: number;
    titre: string;
    type: OpportuniteType;
    organisme?: string;
    pays?: string;
    date_limite?: string;
    image?: string;
    lien_postuler?: string;
    actif: boolean;
    date_creation: string;
}

export const opportunitesService = {
    async getAll(): Promise<Opportunite[]> {
        return api.get<Opportunite[]>('/opportunites');
    },

    async getById(id: string): Promise<Opportunite> {
        return api.get<Opportunite>(`/opportunites/${id}`);
    },

    async create(data: {
        titre: string;
        type: OpportuniteType;
        organisme?: string;
        pays?: string;
        date_limite?: string;
        image?: string;
        lien_postuler?: string;
        actif?: boolean;
    }): Promise<Opportunite> {
        return api.post<Opportunite>('/opportunites', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        type: OpportuniteType;
        organisme: string;
        pays: string;
        date_limite: string;
        image: string;
        lien_postuler: string;
        actif: boolean;
    }>): Promise<Opportunite> {
        return api.put<Opportunite>(`/opportunites/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/opportunites/${id}`);
    },
};
