import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export interface Publicite {
    id: number;
    titre: string;
    image?: string;
    media?: string;
    type_media?: 'Image' | 'Video';
    lien_inscription?: string;
    ordre: number;
    actif: boolean;
    date_creation: string;
}

export interface PublicitesFilters extends PaginationParams {
    titre?: string;
}

export const publicitesService = {
    async getAll(params?: PublicitesFilters): Promise<PaginationResponse<Publicite>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Publicite>>(`/publicites${query}`);
    },

    async getById(id: string): Promise<Publicite> {
        return api.get<Publicite>(`/publicites/${id}`);
    },

    async create(data: {
        titre: string;
        image?: string;
        media?: string;
        type_media?: 'Image' | 'Video';
        lien_inscription?: string;
        ordre?: number;
        actif?: boolean;
    }): Promise<Publicite> {
        return api.post<Publicite>('/publicites', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        image: string;
        media: string;
        type_media: 'Image' | 'Video';
        lien_inscription: string;
        ordre: number;
        actif: boolean;
    }>): Promise<Publicite> {
        return api.put<Publicite>(`/publicites/${id}`, data);
    },

    async download(id: number | string): Promise<Blob> {
        return api.download(`/publicites/${id}/media`);
    },

    async downloadMedia(id: number | string): Promise<Blob> {
        return api.download(`/publicites/${id}/media`);
    },

    async downloadImage(id: number | string): Promise<Blob> {
        return api.download(`/publicites/${id}/image`);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/publicites/${id}`);
    },
};
