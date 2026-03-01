import { api } from '../api';

export interface ServiceTypeItem {
    id: number;
    nom: string;
    slug: string;
    description?: string;
}

export const serviceTypesService = {
    getAll: async () => {
        return api.get<ServiceTypeItem[]>(`/service-types`);
    },

    getOne: async (id: number) => {
        return api.get<ServiceTypeItem>(`/service-types/${id}`);
    },

    create: async (data: Omit<ServiceTypeItem, 'id' | 'slug'>) => {
        return api.post<ServiceTypeItem>(`/service-types`, data);
    },

    update: async (id: number, data: Partial<ServiceTypeItem>) => {
        return api.put<ServiceTypeItem>(`/service-types/${id}`, data);
    },

    delete: async (id: number) => {
        return api.delete<{ message: string }>(`/service-types/${id}`);
    }
};
