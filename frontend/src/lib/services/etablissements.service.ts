import { api } from '../api';
import type { Etablissement, Filiere, NiveauEtude, Matiere } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const etablissementsService = {
  async getAll(params?: PaginationParams & { search?: string; all?: boolean }): Promise<PaginationResponse<Etablissement>> {
    const query = buildPaginationQuery(params);
    // Admin must see every établissement (incl. those without épreuves), unlike
    // the mobile default which hides empty ones. Opt out explicitly with all:false.
    const includeAll = params?.all !== false;
    const sep = query ? '&' : '?';
    const suffix = includeAll ? `${sep}all=true` : '';
    return api.get<PaginationResponse<Etablissement>>(`/etablissements${query}${suffix}`);
  },

  async getById(id: number): Promise<Etablissement> {
    return api.get<Etablissement>(`/etablissements/${id}`);
  },

  async getFilieres(etablissementId: string, params?: PaginationParams & { search?: string; all?: boolean }): Promise<PaginationResponse<Filiere>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Filiere>>(`/etablissements/${etablissementId}/filieres${query}`);
  },

  async getNiveaux(etablissementId: string, filiereId: string, params?: PaginationParams & { search?: string; all?: boolean }): Promise<PaginationResponse<NiveauEtude>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<NiveauEtude>>(`/etablissements/${etablissementId}/filieres/${filiereId}/niveau-etude${query}`);
  },

  async getMatieres(etablissementId: string, filiereId: string, niveauId: string, params?: PaginationParams & { search?: string; all?: boolean }): Promise<PaginationResponse<Matiere>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Matiere>>(`/etablissements/${etablissementId}/filieres/${filiereId}/niveau-etude/${niveauId}/matieres${query}`);
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
