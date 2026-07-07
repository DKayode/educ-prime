import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';
import { filesService } from './files.service';

export interface TypeProfil {
    id: number;
    uuid?: string;
    titre: string;
    sous_titre?: string;
    /** Full public URL of the R2 icône (slot type_profils.icone). Prefer FileImage. */
    icone_path?: string;
    icone_extension?: string;
    pays?: string;
    date_creation?: string;
}

export interface TypeProfilsFilters extends PaginationParams {
    search?: string;
}

/** Une ligne du registre entité ↔ type de profil (audience). */
export interface EntityTypeProfilAssoc {
    entity: string;
    type_profil: { uuid: string; id: number; titre: string; sous_titre: string | null } | null;
}

export const typeProfilsService = {
    async getAll(params?: TypeProfilsFilters): Promise<PaginationResponse<TypeProfil>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<TypeProfil>>(`/type-profils${query}`);
    },

    async getById(id: number): Promise<TypeProfil> {
        return api.get<TypeProfil>(`/type-profils/${id}`);
    },

    async create(data: { titre: string; sous_titre?: string }): Promise<TypeProfil> {
        // Country-scoped server-side via @CurrentCountry(); pays never in the body.
        return api.post<TypeProfil>('/type-profils', data);
    },

    async update(id: number, data: Partial<{ titre: string; sous_titre: string }>): Promise<TypeProfil> {
        return api.put<TypeProfil>(`/type-profils/${id}`, data);
    },

    async delete(id: number): Promise<void> {
        return api.delete(`/type-profils/${id}`);
    },

    /**
     * Upload the icône to the R2 public slot `type_profils.icone`. The row must
     * already exist (its uuid keys the R2 object). Icône is optional — only call
     * this when the admin actually picked a file.
     */
    async uploadIcone(uuid: string, file: File) {
        return filesService.uploadFile('type_profils', uuid, 'icone', file);
    },

    /** Registre : type de profil associé à chaque entité de contenu (audience). */
    async getRegistry(): Promise<EntityTypeProfilAssoc[]> {
        return api.get<EntityTypeProfilAssoc[]>('/type-profils/registry');
    },

    /** Associe (ou dissocie si type_profil_id = null) une entité à un type de profil. */
    async setAssociation(entity: string, type_profil_id: number | null): Promise<EntityTypeProfilAssoc> {
        return api.put<EntityTypeProfilAssoc>('/type-profils/registry', { entity, type_profil_id });
    },
};
