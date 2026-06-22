import { api } from '../api';
import type { Structure } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const structureService = {
  async getAll(params?: PaginationParams & { search?: string; sort_by?: string; sort_order?: string }): Promise<PaginationResponse<Structure>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Structure>>(`/structure${query}`);
  },

  async getById(id: number): Promise<Structure> {
    return api.get<Structure>(`/structure/${id}`);
  },

  async create(data: { nom: string; description?: string }): Promise<Structure> {
    return api.post<Structure>('/structure', data);
  },

  async update(id: number, data: Partial<{ nom: string; description: string }>): Promise<Structure> {
    return api.patch<Structure>(`/structure/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`/structure/${id}`);
  },
};
