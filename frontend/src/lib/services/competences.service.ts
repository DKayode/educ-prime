import { api } from '../api';
import { PaginatedResponse } from '../types';

export interface CompetenceItem {
    id: number;
    nom: string;
    slug: string;
    description?: string;
}

export type CompetenceOptions = {
    page?: number;
    limit?: number;
};

export const competencesService = {
    getAll: async (options: CompetenceOptions = {}) => {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());

        const queryString = params.toString();
        const url = `/competences${queryString ? `?${queryString}` : ''}`;
        return api.get<PaginatedResponse<CompetenceItem>>(url);
    },

    getById: async (id: number) => {
        return api.get<CompetenceItem>(`/competences/${id}`);
    },

    create: async (payload: Omit<CompetenceItem, 'id' | 'slug'>) => {
        return api.post<CompetenceItem>('/competences', payload);
    },

    update: async (id: number, payload: Partial<Omit<CompetenceItem, 'id' | 'slug'>>) => {
        return api.put<CompetenceItem>(`/competences/${id}`, payload);
    },

    delete: async (id: number) => {
        return api.delete<{ message: string }>(`/competences/${id}`);
    }
};
