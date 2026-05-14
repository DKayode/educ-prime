import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

import { Category } from './categories.service';

export interface Parcour {
    id: number;
    uuid?: string;
    titre: string;
    /** Legacy cover URL — prefer FileImage with slot='covert'. */
    image_couverture?: string;
    /** Videos still on Firebase (no R2 video slot). */
    lien_video?: string;
    covert_image_path?: string;
    covert_image_extension?: string;
    content_image_path?: string;
    content_image_extension?: string;
    type_media: 'image' | 'video'; // lowercase to match backend entity enum
    category: Category;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface ParcoursFilters extends PaginationParams {
    titre?: string;
    categorie?: string;
    type_media?: 'image' | 'video';
    search?: string;
}

export const parcoursService = {
    async getAll(params?: ParcoursFilters): Promise<PaginationResponse<Parcour>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Parcour>>(`/parcours${query}`);
    },

    async getById(id: string): Promise<Parcour> {
        return api.get<Parcour>(`/parcours/${id}`);
    },

    async create(data: {
        titre: string;
        image_couverture?: string;
        lien_video?: string;
        type_media: 'image' | 'video';
        category_id: number;
        description: string;
    }): Promise<Parcour> {
        return api.post<Parcour>('/parcours', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        image_couverture: string;
        lien_video: string;
        type_media: 'image' | 'video';
        category_id: number;
        description: string;
    }>): Promise<Parcour> {
        return api.patch<Parcour>(`/parcours/${id}`, data); // Backend uses @Patch
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/parcours/${id}`);
    },

    async search(term: string, limit?: number): Promise<Parcour[]> {
        const query = limit ? `?limit=${limit}` : '';
        return api.get<Parcour[]>(`/parcours/search/${term}${query}`);
    },

    async downloadImage(id: number): Promise<Blob> {
        return api.download(`/parcours/${id}/image`);
    }
};
