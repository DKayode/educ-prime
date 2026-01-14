import { api } from '../api';
import type { Utilisateur } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const usersService = {
  async getAll(params?: PaginationParams & { search?: string; role?: string; activated?: boolean; sort_by?: string; sort_order?: 'ASC' | 'DESC' }): Promise<PaginationResponse<Utilisateur>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Utilisateur>>(`/utilisateurs${query}`);
  },



  async create(data: Partial<Utilisateur> & { mot_de_passe: string }): Promise<Utilisateur> {
    return api.post<Utilisateur>('/utilisateurs', data);
  },

  async update(id: number, data: Partial<Utilisateur>): Promise<Utilisateur> {
    return api.put<Utilisateur>(`/utilisateurs/${id}`, data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return api.delete(`/utilisateurs/${id}`);
  },

  async getProfilePhoto(): Promise<Blob> {
    return api.download('/utilisateurs/photo');
  },
};
