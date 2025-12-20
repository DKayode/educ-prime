import { api } from '../api';
import type { NiveauEtude } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const niveauxService = {
  async getAll(params?: PaginationParams & { nom?: string }): Promise<PaginationResponse<NiveauEtude>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<NiveauEtude>>(`/niveau-etude${query}`);
  },

  async getById(id: number): Promise<NiveauEtude> {
    return api.get<NiveauEtude>(`/niveau-etude/${id}`);
  },

  async create(data: { nom: string; duree_mois?: number; filiere_id: number }): Promise<NiveauEtude> {
    return api.post<NiveauEtude>('/niveau-etude', data);
  },

  async update(id: number, data: Partial<{ nom: string; duree_mois: number; filiere_id: number }>): Promise<NiveauEtude> {
    return api.put<NiveauEtude>(`/niveau-etude/${id}`, data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return api.delete(`/niveau-etude/${id}`);
  },

  async getByFiliere(filiereId: number): Promise<NiveauEtude[]> {
    return api.get<NiveauEtude[]>(`/niveau-etude/filiere/${filiereId}`);
  },
};
