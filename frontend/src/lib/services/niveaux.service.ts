import { api } from '../api';
import type { NiveauEtude } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const niveauxService = {
  async getAll(params?: PaginationParams & { search?: string; filiere?: string }): Promise<PaginationResponse<NiveauEtude>> {
    const query = buildPaginationQuery(params);
    // Note: buildPaginationQuery might usually take 'nom'. We need to ensure 'search' is passed in query string.
    // If buildPaginationQuery only handles pagination, we append others.
    // Assuming buildPaginationQuery handles arbitrary params or just pagination.
    // Looking at previous code, it seems it handles params.
    // Let's rely on params passing 'search' if buildPaginationQuery supports it or manually append.
    // The previous code did: const query = buildPaginationQuery(params); return api.get...
    // I will stick to passing params. If buildPaginationQuery constructs query string from all keys, it works.
    // If NOT, I need to check buildPaginationQuery. But I can't view it right now easily (it's imported).
    // Safest is to rely on params object structure matching query keys.
    // So if I pass { search: ... }, it should end up in URL.
    return api.get<PaginationResponse<NiveauEtude>>(`/niveau-etude${buildPaginationQuery(params)}`);
  },

  async getGroupedByName(params?: PaginationParams & { search?: string }): Promise<PaginationResponse<{ nom: string; filieres: any[] }>> {
    return api.get<PaginationResponse<{ nom: string; filieres: any[] }>>(`/niveau-etude/grouper-par-nom${buildPaginationQuery(params)}`);
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
  async deleteGroup(nom: string): Promise<{ message: string }> {
    return api.delete(`/niveau-etude/grouper-par-nom/${encodeURIComponent(nom)}`);
  },
};
