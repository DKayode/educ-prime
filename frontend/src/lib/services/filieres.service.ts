import { api } from '../api';
import type { Filiere } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const filieresService = {
  async getAll(params?: PaginationParams & { search?: string; etablissement?: string }): Promise<PaginationResponse<Filiere>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Filiere>>(`/filieres${query}`);
  },

  async getById(id: number): Promise<Filiere> {
    return api.get<Filiere>(`/filieres/${id}`);
  },

  async create(data: { nom: string; etablissement_id: number }): Promise<Filiere> {
    return api.post<Filiere>('/filieres', data);
  },

  async update(id: number, data: Partial<{ nom: string; etablissement_id: number }>): Promise<Filiere> {
    return api.put<Filiere>(`/filieres/${id}`, data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return api.delete(`/filieres/${id}`);
  },
};
