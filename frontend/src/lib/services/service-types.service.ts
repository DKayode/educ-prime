import { api } from '../api';
import { PaginatedResponse } from '../types';

export interface ServiceTypeItem {
    id: number;
    nom: string;
    slug: string;
    description?: string;
    entite_type?: 'Services' | 'Offres';
}

export type ServiceTypesOptions = {
    page?: number;
    limit?: number;
    entite_type?: 'Services' | 'Offres';
};

export const serviceTypesService = {
    getAll: async (options: ServiceTypesOptions = {}) => {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.entite_type) params.append('entite_type', options.entite_type);

        const queryString = params.toString();
        const url = `/types${queryString ? `?${queryString}` : ''}`;
        return api.get<PaginatedResponse<ServiceTypeItem>>(url);
    },

    getOne: async (id: number) => {
        return api.get<ServiceTypeItem>(`/types/${id}`);
    },

    create: async (data: Omit<ServiceTypeItem, 'id' | 'slug'>) => {
        return api.post<ServiceTypeItem>(`/types`, data);
    },

    update: async (id: number, data: Partial<ServiceTypeItem>) => {
        return api.put<ServiceTypeItem>(`/types/${id}`, data);
    },

    delete: async (id: number) => {
        return api.delete<{ message: string }>(`/types/${id}`);
    }
};
