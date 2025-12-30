import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

// export type ConcoursExamenType = 'Concours' | 'Examens'; // REMOVED

export interface Concours {
    id: number;
    titre: string;
    url?: string;
    annee?: number;
    lieu?: string;
    nombre_page: number;
    nombre_telechargements: number;
}

export const concoursService = {
    async getAll(params?: PaginationParams & { search?: string; annee?: number; sort_by?: string; sort_order?: string }): Promise<PaginationResponse<Concours>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Concours>>(`/concours${query}`);
    },

    async getAnnees(): Promise<number[]> {
        return api.get<number[]>('/concours/annees');
    },

    async getById(id: string): Promise<Concours> {
        return api.get<Concours>(`/concours/${id}`);
    },

    async create(data: {
        titre: string;
        url?: string;
        annee?: number;
        lieu?: string;
        nombre_page?: number;
    }): Promise<Concours> {
        return api.post<Concours>('/concours', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        url: string;
        annee: number;
        lieu: string;
        nombre_page: number;
    }>): Promise<Concours> {
        return api.put<Concours>(`/concours/${id}`, data);
    },

    async download(id: number | string): Promise<Blob> {
        return api.download(`/concours/${id}/telechargement`);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/concours/${id}`);
    },
};
