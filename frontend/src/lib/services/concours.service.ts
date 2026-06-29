import { api } from '../api';
import type { Structure, Titre } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

// export type ConcoursExamenType = 'Concours' | 'Examens'; // REMOVED

export type SubmissionStatus = 'pending_approval' | 'declined' | 'approved';

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

/** One group from GET /v1/concours — concours sharing an official title
 *  (structure + titre), with their per-year instances nested. */
export interface ConcoursGroup {
    structure?: Structure | null;
    titre_ref?: Titre | null;
    official_title: string;
    annees: number[];
    concours: Concours[];
}

/** A user-submitted concours awaiting admin resolution/approval. A parent may
 *  be an existing reference (structure_id/titre_id + relation) OR a proposed
 *  name (proposed_structure/proposed_titre). The API marks which are missing. */
export interface ConcoursSubmission {
    id: number;
    uuid: string;
    structure_id?: number | null;
    structure?: Structure | null;
    proposed_structure?: string | null;
    titre_id?: number | null;
    titre_ref?: Titre | null;
    proposed_titre?: string | null;
    annee?: number | null;
    lieu?: string | null;
    file_path?: string;
    file_extension?: string;
    url?: string;
    status: SubmissionStatus;
    date_creation?: string;
    soumis_par_id?: number | null;
    soumis_par?: {
        id: number;
        uuid?: string;
        nom?: string;
        prenom?: string;
        email?: string;
    } | null;
    missing_structure: boolean;
    missing_titre: boolean;
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

    /** Step 1 — submit concours metadata (any authenticated user). Returns the
     *  submission incl. uuid + missing-parent flags; file uploads separately to
     *  /files/concours_submissions/:uuid/file. */
    async createSubmission(data: {
        structure_id?: number;
        proposed_structure?: string;
        titre_id?: number;
        proposed_titre?: string;
        annee?: number;
        lieu?: string;
    }): Promise<ConcoursSubmission> {
        return api.post<ConcoursSubmission>('/concours/submissions', data);
    },

    /** Admin: list concours submissions (defaults to pending_approval). */
    async getSubmissions(params?: PaginationParams & { status?: string }): Promise<PaginationResponse<ConcoursSubmission>> {
        const query = buildPaginationQuery({ status: 'pending_approval', ...params } as PaginationParams);
        return api.get<PaginationResponse<ConcoursSubmission>>(`/concours/submissions${query}`);
    },

    /** Admin: approve a submission → creates the real concours. Pass resolved
     *  structure_id/titre_id to bind any proposed (missing) parents. */
    async approveSubmission(id: number, resolve?: { structure_id?: number; titre_id?: number }): Promise<{ message: string; concours: Concours; submission: ConcoursSubmission }> {
        return api.patch(`/concours/submissions/${id}/approve`, resolve ?? {});
    },

    /** Admin: decline a submission (+ emails the uploader). */
    async declineSubmission(id: number): Promise<{ message: string; submission: ConcoursSubmission }> {
        return api.patch(`/concours/submissions/${id}/decline`, {});
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
