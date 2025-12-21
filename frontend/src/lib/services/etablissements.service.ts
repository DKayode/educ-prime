import { api } from '../api';
import type { Etablissement } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';
import { Ressource } from "./ressources.service";

export const etablissementsService = {
  async getAll(params?: PaginationParams & { nom?: string; ville?: string }): Promise<PaginationResponse<Etablissement>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Etablissement>>(`/etablissements${query}`);
  },

  async getById(id: number): Promise<Etablissement> {
    return api.get<Etablissement>(`/etablissements/${id}`);
  },

  getRessourcesByMatiereAndType(etablissementId: string, filiereId: string, niveauId: string, matiereId: string, type: string, page = 1, limit = 10) {
    const query = buildPaginationQuery({ page, limit });
    return api.get<PaginationResponse<Ressource>>(`/etablissements/${etablissementId}/filieres/${filiereId}/niveau-etude/${niveauId}/matieres/${matiereId}/ressources/type/${type}${query}`);
  },

  async create(data: { nom: string; ville?: string; code_postal?: string; logo?: string }): Promise<Etablissement> {
    return api.post<Etablissement>('/etablissements', data);
  },

  async update(id: number, data: Partial<{ nom: string; ville: string; code_postal: string; logo: string }>): Promise<Etablissement> {
    return api.put<Etablissement>(`/etablissements/${id}`, data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return api.delete(`/etablissements/${id}`);
  },
};
