import { api } from '../api';

export type ConcoursExamenType = 'Concours' | 'Examens';

export interface ConcoursExamen {
    id: number;
    titre: string;
    type: ConcoursExamenType;
    pays?: string;
    niveau?: string;
    date?: string;
    lieu?: string;
    image?: string;
    rubriques?: string;
    fichiers_telechargeables?: string;
    actif: boolean;
    date_creation: string;
}

export const concoursExamensService = {
    async getAll(): Promise<ConcoursExamen[]> {
        return api.get<ConcoursExamen[]>('/concours-examens');
    },

    async getById(id: string): Promise<ConcoursExamen> {
        return api.get<ConcoursExamen>(`/concours-examens/${id}`);
    },

    async create(data: {
        titre: string;
        type: ConcoursExamenType;
        pays?: string;
        niveau?: string;
        date?: string;
        lieu?: string;
        image?: string;
        rubriques?: string;
        fichiers_telechargeables?: string;
        actif?: boolean;
    }): Promise<ConcoursExamen> {
        return api.post<ConcoursExamen>('/concours-examens', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        type: ConcoursExamenType;
        pays: string;
        niveau: string;
        date: string;
        lieu: string;
        image: string;
        rubriques: string;
        fichiers_telechargeables: string;
        actif: boolean;
    }>): Promise<ConcoursExamen> {
        return api.put<ConcoursExamen>(`/concours-examens/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/concours-examens/${id}`);
    },
};
