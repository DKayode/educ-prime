import { api } from '../api';
import type { Epreuve } from '../types';

export const epreuvesService = {
  async getAll(): Promise<Epreuve[]> {
    return api.get<Epreuve[]>('/epreuves');
  },

  async getById(id: string): Promise<Epreuve> {
    return api.get<Epreuve>(`/epreuves/${id}`);
  },

  async getByFiliere(filiereId: string): Promise<Epreuve[]> {
    return api.get<Epreuve[]>(`/epreuves/filiere/${filiereId}`);
  },

  async getByMatiere(matiereId: string): Promise<Epreuve[]> {
    return api.get<Epreuve[]>(`/epreuves/matiere/${matiereId}`);
  },

  async create(data: {
    titre: string;
    description?: string;
    annee_academique: string;
    filiere_id?: string;
    matiere_id?: string;
    niveau_etude_id?: string;
  }): Promise<Epreuve> {
    return api.post<Epreuve>('/epreuves', data);
  },

  async update(id: string, data: {
    titre?: string;
    description?: string;
    annee_academique?: string;
    filiere_id?: string;
    matiere_id?: string;
    niveau_etude_id?: string;
  }): Promise<Epreuve> {
    return api.put<Epreuve>(`/epreuves/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/epreuves/${id}`);
  },

  async uploadFile(epreuveId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post<{ url: string }>(`/fichiers/epreuve/${epreuveId}`, formData);
  },

  async deleteFile(fileId: string): Promise<void> {
    return api.delete(`/fichiers/${fileId}`);
  },
};
