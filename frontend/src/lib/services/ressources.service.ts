import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export interface Ressource {
    id: number;
    titre: string;
    type: 'Quiz' | 'Exercices' | 'Document';
    nombre_pages?: number;
    url: string;
    date_creation: string;
    date_publication?: string;
    professeur_id: number;
    matiere_id: number;
    matiere?: {
        id: number;
        nom: string;
    };
    professeur?: {
        id: number;
        nom: string;
        prenom: string;
    };
}

export interface CreateRessourceData {
    titre: string;
    url: string;
    type: 'Quiz' | 'Exercices' | 'Document';
    matiere_id: number;
}

export const ressourcesService = {
    async getAll(params?: PaginationParams): Promise<PaginationResponse<Ressource>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Ressource>>(`/ressources${query}`);
    },

    async getOne(id: string): Promise<Ressource> {
        return api.get<Ressource>(`/ressources/${id}`);
    },

    async create(data: CreateRessourceData): Promise<Ressource> {
        return api.post<Ressource>('/ressources', data);
    },

    async update(id: string, data: Partial<CreateRessourceData>): Promise<Ressource> {
        return api.put<Ressource>(`/ressources/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/ressources/${id}`);
    },

    async getByMatiere(matiereId: string, params?: PaginationParams): Promise<PaginationResponse<Ressource>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Ressource>>(`/ressources/matiere/${matiereId}${query}`);
    },

    async getByType(type: string, params?: PaginationParams): Promise<PaginationResponse<Ressource>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Ressource>>(`/ressources/type/${type}${query}`);
    },

    async download(id: number | string): Promise<Blob> {
        return api.download(`/ressources/${id}/telechargement`);
    },
};
