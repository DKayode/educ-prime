import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

// ---- Lookups -------------------------------------------------------------
export interface TypeExamen { id: number; uuid?: string; nom: string; description?: string | null; }
export interface Serie { id: number; uuid?: string; nom: string; type_examen_id: number; type_examen?: TypeExamen; description?: string | null; }
export interface MatiereExamen { id: number; uuid?: string; nom: string; type_examen_id: number; type_examen?: TypeExamen; description?: string | null; }
export interface FiliereExamen { id: number; uuid?: string; nom: string; type_examen_id: number; type_examen?: TypeExamen; description?: string | null; }

export interface ExamenNational {
    id: number;
    uuid?: string;
    titre: string;
    type_examen_id: number;
    type_examen?: TypeExamen;
    serie_id?: number | null;
    serie?: Serie | null;
    // Matière et filière indépendantes et optionnelles (au moins l'une des deux).
    matiere_examen_id?: number | null;
    matiere_examen?: MatiereExamen | null;
    filiere_examen_id?: number | null;
    filiere_examen?: FiliereExamen | null;
    section?: string | null;
    annee: number;
    file_path?: string;
    file_extension?: string;
    url?: string;
    nombre_pages?: number;
    nombre_telechargements?: number;
    date_creation?: string;
}

export type SubmissionStatus = 'pending_approval' | 'declined' | 'approved';

export interface ExamenNationalSubmission {
    id: number;
    uuid: string;
    type_examen_id?: number | null;
    type_examen?: TypeExamen | null;
    proposed_type?: string | null;
    serie_id?: number | null;
    serie?: Serie | null;
    proposed_serie?: string | null;
    matiere_examen_id?: number | null;
    matiere_examen?: MatiereExamen | null;
    proposed_matiere?: string | null;
    filiere_examen_id?: number | null;
    filiere_examen?: FiliereExamen | null;
    proposed_filiere?: string | null;
    section?: string | null;
    annee?: number | null;
    titre?: string;
    file_path?: string;
    file_extension?: string;
    url?: string;
    status: SubmissionStatus;
    decline_reason?: string | null;
    date_creation?: string;
    soumis_par_id?: number | null;
    soumis_par?: { id: number; uuid?: string; nom?: string; prenom?: string; email?: string } | null;
    missing_type: boolean;
    missing_serie: boolean;
    missing_matiere: boolean;
    missing_filiere: boolean;
    missing_classifier: boolean;
}

// ---- Lookup services -----------------------------------------------------
export const typesExamenService = {
    getAll: (params?: PaginationParams & { search?: string }) =>
        api.get<PaginationResponse<TypeExamen>>(`/types-examen${buildPaginationQuery(params)}`),
    create: (data: { nom: string; description?: string }) => api.post<TypeExamen>('/types-examen', data),
    update: (id: number, data: Partial<{ nom: string; description: string }>) => api.patch<TypeExamen>(`/types-examen/${id}`, data),
    delete: (id: number) => api.delete(`/types-examen/${id}`),
};

export const seriesService = {
    getAll: (params?: PaginationParams & { search?: string; type_examen?: number }) =>
        api.get<PaginationResponse<Serie>>(`/series${buildPaginationQuery(params)}`),
    create: (data: { nom: string; type_examen_id: number; description?: string }) => api.post<Serie>('/series', data),
    update: (id: number, data: Partial<{ nom: string; type_examen_id: number; description: string }>) => api.patch<Serie>(`/series/${id}`, data),
    delete: (id: number) => api.delete(`/series/${id}`),
};

export const matieresExamenService = {
    getAll: (params?: PaginationParams & { search?: string; type_examen?: number }) =>
        api.get<PaginationResponse<MatiereExamen>>(`/matieres-examen${buildPaginationQuery(params)}`),
    create: (data: { nom: string; type_examen_id: number; description?: string }) => api.post<MatiereExamen>('/matieres-examen', data),
    update: (id: number, data: Partial<{ nom: string; type_examen_id: number; description: string }>) => api.patch<MatiereExamen>(`/matieres-examen/${id}`, data),
    delete: (id: number) => api.delete(`/matieres-examen/${id}`),
};

export const filieresExamenService = {
    getAll: (params?: PaginationParams & { search?: string; type_examen?: number }) =>
        api.get<PaginationResponse<FiliereExamen>>(`/filieres-examen${buildPaginationQuery(params)}`),
    create: (data: { nom: string; type_examen_id: number; description?: string }) => api.post<FiliereExamen>('/filieres-examen', data),
    update: (id: number, data: Partial<{ nom: string; type_examen_id: number; description: string }>) => api.patch<FiliereExamen>(`/filieres-examen/${id}`, data),
    delete: (id: number) => api.delete(`/filieres-examen/${id}`),
};

// ---- Main resource -------------------------------------------------------
export const examensNationauxService = {
    getAll: (params?: PaginationParams & { search?: string; type_examen?: number; serie?: number; matiere_examen?: number; filiere_examen?: number; annee?: number }) =>
        api.get<PaginationResponse<ExamenNational>>(`/examens-nationaux${buildPaginationQuery(params)}`),
    getAnnees: () => api.get<number[]>('/examens-nationaux/annees'),
    getById: (id: number) => api.get<ExamenNational>(`/examens-nationaux/${id}`),
    create: (data: { type_examen_id: number; serie_id?: number; matiere_examen_id?: number; filiere_examen_id?: number; section?: string; annee: number; nombre_pages?: number }) =>
        api.post<ExamenNational>('/examens-nationaux', data),
    update: (id: number, data: Partial<{ type_examen_id: number; serie_id: number; matiere_examen_id: number; filiere_examen_id: number; section: string; annee: number; nombre_pages: number }>) =>
        api.put<ExamenNational>(`/examens-nationaux/${id}`, data),
    delete: (id: number) => api.delete(`/examens-nationaux/${id}`),
};

// ---- Submissions ---------------------------------------------------------
export interface ResolveExamenSubmissionData {
    type_examen_id?: number; proposed_type?: string;
    serie_id?: number; proposed_serie?: string;
    matiere_examen_id?: number; proposed_matiere?: string;
    filiere_examen_id?: number; proposed_filiere?: string;
    section?: string; annee?: number;
}

export const examensNationauxSubmissionsService = {
    list: (params?: PaginationParams & { status?: string }) =>
        api.get<PaginationResponse<ExamenNationalSubmission>>(`/examens-nationaux/submissions${buildPaginationQuery({ status: 'pending_approval', ...params } as PaginationParams)}`),
    listMine: (params?: PaginationParams & { status?: string }) =>
        api.get<PaginationResponse<ExamenNationalSubmission>>(`/examens-nationaux/submissions/mine${buildPaginationQuery(params)}`),
    createSubmission: (data: {
        type_examen_id?: number; proposed_type?: string;
        serie_id?: number; proposed_serie?: string;
        matiere_examen_id?: number; proposed_matiere?: string;
        filiere_examen_id?: number; proposed_filiere?: string;
        section?: string; annee?: number;
    }) => api.post<ExamenNationalSubmission>('/examens-nationaux/submissions', data),
    resolve: (id: number, data: ResolveExamenSubmissionData) => api.patch<ExamenNationalSubmission>(`/examens-nationaux/submissions/${id}`, data),
    approve: (id: number, resolve?: { type_examen_id?: number; serie_id?: number; matiere_examen_id?: number; filiere_examen_id?: number }) =>
        api.patch(`/examens-nationaux/submissions/${id}/approve`, resolve ?? {}),
    decline: (id: number, reason?: string) => api.patch(`/examens-nationaux/submissions/${id}/decline`, reason ? { reason } : {}),
};
