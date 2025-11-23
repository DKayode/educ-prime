import { api } from '../api';
import type { NiveauEtude } from '../types';

export const niveauxService = {
  async getAll(): Promise<NiveauEtude[]> {
    return api.get<NiveauEtude[]>('/niveau-etude');
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
