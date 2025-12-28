import { api } from '../api';
import type { Epreuve } from '../types';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export const epreuvesService = {
  async getAll(params?: PaginationParams & { search?: string; type?: string; matiere?: string }): Promise<PaginationResponse<Epreuve>> {
    const query = buildPaginationQuery(params);
    return api.get<PaginationResponse<Epreuve>>(`/epreuves${query}`);
  },

  async getById(id: string): Promise<Epreuve> {
    return api.get<Epreuve>(`/epreuves/${id}`);
  },

  async create(data: {
    titre: string;
    matiere_id: number;
  }): Promise<Epreuve> {
    return api.post<Epreuve>('/epreuves', data);
  },

  async update(id: string, data: {
    titre?: string;
    matiere_id?: number;
    type?: string;
    duree_minutes?: number;
    nombre_pages?: number;
    date_publication?: string;
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

  async download(id: number | string): Promise<Blob> {
    return api.download(`/epreuves/${id}/telechargement`);
  },
};
