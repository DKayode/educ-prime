import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export enum AppPlatform {
    ANDROID = 'android',
    IOS = 'ios',
}

export interface AppVersion {
    id: string;
    platform: AppPlatform;
    version: string;
    minimum_required_version: string;
    update_url: string;
    force_update: boolean;
    release_notes?: { fr?: string; en?: string };
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const appVersionService = {
    async getAll(params?: PaginationParams & { platform?: AppPlatform; is_active?: boolean }): Promise<PaginationResponse<AppVersion>> {
        const query = buildPaginationQuery(params);
        return api.get<PaginationResponse<AppVersion>>(`/app/version/admin${query}`);
    },

    async create(data: Partial<AppVersion>): Promise<AppVersion> {
        return api.post<AppVersion>('/app/version/admin', data);
    },

    async update(id: string, data: Partial<AppVersion>): Promise<AppVersion> {
        return api.put<AppVersion>(`/app/version/admin/${id}`, data);
    },

    async delete(id: string): Promise<any> {
        return api.delete(`/app/version/admin/${id}`);
    },
};
