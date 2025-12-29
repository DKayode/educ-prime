import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export interface Category {
    id: number;
    nom: string;
    slug: string;
    description?: string;
    icone?: string;
    is_active: boolean;
    ordre: number;
    created_at: string;
    updated_at: string;
    parcoursCount?: number;
}

export interface CategoriesFilters extends PaginationParams {
    nom?: string;
    search?: string;
}

export const categoriesService = {
    async getAll(params?: CategoriesFilters): Promise<PaginationResponse<Category>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<Category>>(`/categories${query}`);
    },

    async getById(id: string): Promise<Category> {
        return api.get<Category>(`/categories/${id}`);
    },

    async create(data: {
        nom: string;
        description?: string;
        icone?: string;
        is_active?: boolean;
        ordre?: number;
    }): Promise<Category> {
        return api.post<Category>('/categories', data);
    },

    async update(id: string, data: Partial<{
        nom: string;
        description: string;
        icone: string;
        is_active: boolean;
        ordre: number;
    }>): Promise<Category> {
        return api.patch<Category>(`/categories/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/categories/${id}`);
    },

    async getStats(): Promise<any> {
        return api.get('/categories/stats');
    },

    async uploadIcon(id: string, file: File): Promise<Category> {
        const formData = new FormData();
        formData.append('file', file);
        return api.patch<Category>(`/categories/${id}/icone`, formData);
    },

    async getIcon(id: string): Promise<{ url: string }> {
        return api.get<{ url: string }>(`/categories/${id}/icone`);
    }
};
