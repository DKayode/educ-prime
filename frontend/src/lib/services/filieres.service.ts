import { api } from '../api';
import type { Filiere } from '../types';

export const filieresService = {
  async getAll(): Promise<Filiere[]> {
    return api.get<Filiere[]>('/filieres');
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

  async getByEtablissement(etablissementId: number): Promise<Filiere[]> {
    return api.get<Filiere[]>(`/filieres/etablissement/${etablissementId}`);
  },
};
