import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export interface Evenement {
    id: number;
    titre: string;
    description?: string;
    date?: string;
    lieu?: string;
    lien_inscription?: string;
    image?: string;
    actif: boolean;
    date_creation: string;
}

export const evenementsService = {
    async getAll(params?: PaginationParams & { search?: string; sort_by?: string; sort_order?: string; actif?: boolean }): Promise<PaginationResponse<Evenement>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Evenement>>(`/evenements${query}`);
    },

    async getById(id: string): Promise<Evenement> {
        return api.get<Evenement>(`/evenements/${id}`);
    },

    async create(data: {
        titre: string;
        description?: string;
        date?: string;
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
        date: string;
        lieu: string;
        lien_inscription: string;
        image: string;
        actif: boolean;
    }>): Promise<Evenement> {
        return api.put<Evenement>(`/evenements/${id}`, data);
    },

    async download(id: number | string): Promise<Blob> {
        return api.download(`/evenements/${id}/telechargement`);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/evenements/${id}`);
    },
};
