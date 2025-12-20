import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export interface ContactsProfessionnel {
    id: number;
    nom: string;
    email: string;
    telephone?: string;
    message?: string;
    reseaux_sociaux?: Record<string, string>;
    actif: boolean;
    date_creation: string;
}

export const contactsProfessionnelsService = {
    async getAll(params?: PaginationParams): Promise<PaginationResponse<ContactsProfessionnel>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<ContactsProfessionnel>>(`/contacts-professionnels${query}`);
    },

    async getById(id: string): Promise<ContactsProfessionnel> {
        return api.get<ContactsProfessionnel>(`/contacts-professionnels/${id}`);
    },

    async create(data: {
        nom: string;
        email: string;
        telephone?: string;
        message?: string;
        reseaux_sociaux?: Record<string, string>;
        actif?: boolean;
    }): Promise<ContactsProfessionnel> {
        return api.post<ContactsProfessionnel>('/contacts-professionnels', data);
    },

    async update(id: string, data: Partial<{
        nom: string;
        email: string;
        telephone: string;
        message: string;
        reseaux_sociaux: Record<string, string>;
        actif: boolean;
    }>): Promise<ContactsProfessionnel> {
        return api.put<ContactsProfessionnel>(`/contacts-professionnels/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/contacts-professionnels/${id}`);
    },
};
