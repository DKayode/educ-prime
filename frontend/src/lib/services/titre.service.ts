import { api } from '../api';
import type { Titre } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const titreService = {
  async getAll(params?: PaginationParams & { search?: string; sort_by?: string; sort_order?: string }): Promise<PaginationResponse<Titre>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Titre>>(`/titre${query}`);
  },

  async getById(id: number): Promise<Titre> {
    return api.get<Titre>(`/titre/${id}`);
  },

  async create(data: { nom: string; description?: string }): Promise<Titre> {
    return api.post<Titre>('/titre', data);
  },

  async update(id: number, data: Partial<{ nom: string; description: string }>): Promise<Titre> {
    return api.patch<Titre>(`/titre/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return api.delete(`/titre/${id}`);
  },
};
