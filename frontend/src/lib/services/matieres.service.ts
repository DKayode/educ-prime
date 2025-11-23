import { api } from '../api';
import type { Matiere } from '../types';

export const matieresService = {
  async getAll(): Promise<Matiere[]> {
    return api.get<Matiere[]>('/matieres');
  },

  async getById(id: string): Promise<Matiere> {
    return api.get<Matiere>(`/matieres/${id}`);
  },

  async getByFiliere(filiereId: string): Promise<Matiere[]> {
    return api.get<Matiere[]>(`/matieres/filiere/${filiereId}`);
  },

  async getByNiveau(niveauId: string): Promise<Matiere[]> {
    return api.get<Matiere[]>(`/matieres/niveau/${niveauId}`);
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
