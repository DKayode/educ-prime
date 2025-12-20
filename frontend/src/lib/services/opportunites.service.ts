import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export type OpportuniteType = 'Bourses' | 'Stages';

export interface Opportunite {
    id: number;
    titre: string;
    type: OpportuniteType;
    organisme?: string;
    lieu?: string;
    date_limite?: string;
    image?: string;
    lien_postuler?: string;
    actif: boolean;
    date_creation: string;
}

export const opportunitesService = {
    async getAll(params?: PaginationParams & { titre?: string, type?: OpportuniteType, lieu?: string, organisme?: string }): Promise<PaginationResponse<Opportunite>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Opportunite>>(`/opportunites${query}`);
    },

    async getById(id: string): Promise<Opportunite> {
        return api.get<Opportunite>(`/opportunites/${id}`);
    },


    async create(data: {
        titre: string;
        type: OpportuniteType;
        organisme?: string;
        lieu?: string;
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
        lieu: string;
        date_limite: string;
        image: string;
        lien_postuler: string;
        actif: boolean;
    }>): Promise<Opportunite> {
        return api.put<Opportunite>(`/opportunites/${id}`, data);
    },

    async download(id: number | string): Promise<Blob> {
        return api.download(`/opportunites/${id}/telechargement`);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/opportunites/${id}`);
    },
};
