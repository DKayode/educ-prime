import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export interface Departement {
  id: number;
  nom: string;
  code?: string | null;
  pays?: string;
  date_creation?: string;
}

// Summary returned by the CSV import endpoints
export interface ImportSummary {
  created: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

export const departementsService = {
  async getAll(
    params?: PaginationParams & { search?: string },
  ): Promise<PaginationResponse<Departement>> {
    return api.get<PaginationResponse<Departement>>(`/departements${buildPaginationQuery(params)}`);
  },

  async getById(id: number): Promise<Departement> {
    return api.get<Departement>(`/departements/${id}`);
  },

  async create(data: { nom: string; code?: string }): Promise<Departement> {
    return api.post<Departement>('/departements', data);
  },

  async update(id: number, data: Partial<{ nom: string; code: string }>): Promise<Departement> {
    return api.put<Departement>(`/departements/${id}`, data);
  },

  async delete(id: number): Promise<{ message: string }> {
    // remove() is country-scoped server-side; DELETE carries no body and
    // api.delete doesn't auto-append ?country=, so pass it explicitly.
    const country = api.getCountry();
    return api.delete(`/departements/${id}?country=${encodeURIComponent(country)}`);
  },

  async importCsv(file: File): Promise<ImportSummary> {
    // multipart → api.post falls back to ?country= (middleware runs before multer)
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ImportSummary>('/departements/import-csv', formData);
  },
};
