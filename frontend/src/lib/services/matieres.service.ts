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
    filiere_id?: string | number;
    niveau_etude_id?: string | number;
  }): Promise<Matiere> {
    // The backend DTO requires numeric ids (@IsNumber, no implicit coercion),
    // so normalize before sending — callers may pass either.
    return api.post<Matiere>('/matieres', {
      ...data,
      filiere_id: data.filiere_id != null ? Number(data.filiere_id) : undefined,
      niveau_etude_id: data.niveau_etude_id != null ? Number(data.niveau_etude_id) : undefined,
    });
  },

  async update(id: string, data: {
    nom?: string;
    description?: string;
    filiere_id?: string | number;
    niveau_etude_id?: string | number;
  }): Promise<Matiere> {
    return api.put<Matiere>(`/matieres/${id}`, {
      ...data,
      filiere_id: data.filiere_id != null ? Number(data.filiere_id) : undefined,
      niveau_etude_id: data.niveau_etude_id != null ? Number(data.niveau_etude_id) : undefined,
    });
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/matieres/${id}`);
  },
};
