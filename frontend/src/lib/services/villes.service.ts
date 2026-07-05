import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';
import type { Departement, ImportSummary } from './departements.service';

export interface Ville {
  id: string; // uuid
  nom: string;
  departement_id: string; // uuid
  pays?: string;
  departement?: Departement;
  date_creation?: string;
}

export const villesService = {
  async getAll(
    params?: PaginationParams & { search?: string; departement_id?: string },
  ): Promise<PaginationResponse<Ville>> {
    return api.get<PaginationResponse<Ville>>(`/villes${buildPaginationQuery(params)}`);
  },

  async getById(id: string): Promise<Ville> {
    return api.get<Ville>(`/villes/${id}`);
  },

  async create(data: { nom: string; departement_id: string }): Promise<Ville> {
    return api.post<Ville>('/villes', data);
  },

  async update(id: string, data: Partial<{ nom: string; departement_id: string }>): Promise<Ville> {
    return api.put<Ville>(`/villes/${id}`, data);
  },

  async delete(id: string): Promise<{ message: string }> {
    // country-scoped server-side; append ?country= explicitly (see departements.service)
    const country = api.getCountry();
    return api.delete(`/villes/${id}?country=${encodeURIComponent(country)}`);
  },

  async importCsv(file: File): Promise<ImportSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ImportSummary>('/villes/import-csv', formData);
  },
};
