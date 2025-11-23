import { api } from '../api';
import type { Utilisateur } from '../types';

export const usersService = {
  async getAll(): Promise<Utilisateur[]> {
    return api.get<Utilisateur[]>('/utilisateurs');
  },

  async getById(id: number): Promise<Utilisateur> {
    return api.get<Utilisateur>(`/utilisateurs/${id}`);
  },

  async create(data: Partial<Utilisateur> & { mot_de_passe: string }): Promise<Utilisateur> {
    return api.post<Utilisateur>('/utilisateurs/inscription/admin', data);
  },

  async update(id: number, data: Partial<Utilisateur>): Promise<Utilisateur> {
    return api.put<Utilisateur>(`/utilisateurs/${id}`, data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return api.delete(`/utilisateurs/${id}`);
  },
};
