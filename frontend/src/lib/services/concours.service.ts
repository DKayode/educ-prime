import { api } from '../api';
import type { Structure, Titre } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

// export type ConcoursExamenType = 'Concours' | 'Examens'; // REMOVED

export interface Concours {
    id: number;
    uuid?: string;
    titre: string;
    /** Legacy URL — prefer download-url with slot='file'. */
    url?: string;
    file_path?: string;
    file_extension?: string;
    annee?: number;
    lieu?: string;
    nombre_page: number;
    nombre_telechargements: number;
    /** Optional reference to the organizing structure (lookup entity). */
    structure_id?: number;
    structure?: Structure;
    /** Optional reference to the recruited titre/poste (lookup entity).
     *  Named titre_ref to avoid clashing with the free-text `titre` column. */
    titre_id?: number;
    titre_ref?: Titre;
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
        /** Optional — the server auto-composes titre from structure + titre refs. */
        titre?: string;
        url?: string;
        annee?: number;
        lieu?: string;
        nombre_page?: number;
        structure_id?: number;
        titre_id?: number;
    }): Promise<Concours> {
        return api.post<Concours>('/concours', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        url: string;
        annee: number;
        lieu: string;
        nombre_page: number;
        structure_id: number;
        titre_id: number;
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
