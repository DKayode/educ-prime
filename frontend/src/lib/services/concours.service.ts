import { api } from '../api';
import type { Structure, Titre } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

// export type ConcoursExamenType = 'Concours' | 'Examens'; // REMOVED

export type ConcoursStatus = 'pending_approval' | 'declined' | 'approved' | 'active' | 'inactive';

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
    /** Approval state. Non-admin reads only ever return 'approved'. */
    status?: ConcoursStatus;
    /** Optional reference to the organizing structure (lookup entity). */
    structure_id?: number;
    structure?: Structure;
    /** Optional reference to the recruited titre/poste (lookup entity).
     *  Named titre_ref to avoid clashing with the free-text `titre` column. */
    titre_id?: number;
    titre_ref?: Titre;
    /** Uploader (the user who submitted a user-uploaded concours). */
    soumis_par_id?: number;
    soumis_par?: {
        id: number;
        uuid?: string;
        nom?: string;
        prenom?: string;
        email?: string;
    };
}

/** One group from GET /v1/concours — concours sharing an official title
 *  (structure + titre), with their per-year instances nested. */
export interface ConcoursGroup {
    structure?: Structure | null;
    titre_ref?: Titre | null;
    official_title: string;
    annees: number[];
    concours: Concours[];
}

export const concoursService = {
    async getAll(params?: PaginationParams & { search?: string; annee?: number; sort_by?: string; sort_order?: string }): Promise<PaginationResponse<Concours>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Concours>>(`/concours${query}`);
    },

    async getAnnees(): Promise<number[]> {
        return api.get<number[]>('/concours/annees');
    },

    /** GET /v1/concours — grouped by official title, paginated over groups. */
    async getGrouped(params?: PaginationParams & { search?: string }): Promise<PaginationResponse<ConcoursGroup>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<ConcoursGroup>>(`/v1/concours${query}`);
    },

    /** Admin: list concours awaiting approval (GET /concours?status=pending_approval). */
    async getPending(params?: PaginationParams): Promise<PaginationResponse<Concours>> {
        const query = buildPaginationQuery({ ...params, status: 'pending_approval' } as PaginationParams);
        return api.get<PaginationResponse<Concours>>(`/concours${query}`);
    },

    /** Admin: approve/decline a concours (PATCH /concours/:id/status). */
    async updateStatus(id: number, status: 'approved' | 'declined'): Promise<Concours> {
        return api.patch<Concours>(`/concours/${id}/status`, { status });
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
