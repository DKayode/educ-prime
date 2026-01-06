import { api } from '../api';
import type { Matiere } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const matieresService = {
  async getAll(params?: PaginationParams & { search?: string; filiere?: string; niveau_etude?: string }): Promise<PaginationResponse<Matiere>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Matiere>>(`/matieres${query}`);
  },

  async getGroupedByName(params?: PaginationParams & { search?: string }): Promise<PaginationResponse<{ nom: string; matieres: Matiere[] }>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<{ nom: string; matieres: Matiere[] }>>(`/matieres/grouper-par-nom${query}`);
  },

  async getById(id: string): Promise<Matiere> {
    return api.get<Matiere>(`/matieres/${id}`);
  },

  async create(data: {
    nom: string;
    description?: string;
    filiere_id?: string;
    niveau_etude_id?: string;
  }): Promise<Matiere> {
    return api.post<Matiere>('/matieres', data);
  },

  async update(id: string, data: {
    nom?: string;
    description?: string;
    filiere_id?: string;
    niveau_etude_id?: string;
  }): Promise<Matiere> {
    return api.put<Matiere>(`/matieres/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/matieres/${id}`);
  },
};
