import { api } from '../api';
import type { Etablissement } from '../types';

export const etablissementsService = {
  async getAll(): Promise<Etablissement[]> {
    return api.get<Etablissement[]>('/etablissements');
  },

  async getById(id: number): Promise<Etablissement> {
    return api.get<Etablissement>(`/etablissements/${id}`);
  },

  async create(data: { nom: string; ville?: string; code_postal?: string }): Promise<Etablissement> {
    return api.post<Etablissement>('/etablissements', data);
  },

  async update(id: number, data: Partial<{ nom: string; ville: string; code_postal: string }>): Promise<Etablissement> {
    return api.put<Etablissement>(`/etablissements/${id}`, data);
  },

  async delete(id: number): Promise<{ message: string }> {
    return api.delete(`/etablissements/${id}`);
  },
};
