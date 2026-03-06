import { api } from '../api';

export interface OffreItem {
    id: number;
    titre: string;
    description: string;
    utilisateur_id: number;
    prix?: number;
    type_id: number;
    status: 'pending_approval' | 'declined' | 'approved' | 'active' | 'inactive';
    temps?: string | null;
    image_couverture?: string | null;
    created_at: string;
    updated_at: string;
    type?: {
        id: number;
        nom: string;
        slug: string;
        description?: string;
    };
    utilisateurs?: {
        id: number;
        uuid?: string;
        nom: string;
        prenom: string;
    };
}

export interface OffresResponse {
    data: OffreItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const offresService = {
    getAllAdmin: async (params?: {
        status?: string;
        page?: number;
        limit?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return api.get<OffresResponse>(`/offres/all${queryString}`);
    },

    updateStatus: async (id: number, status: string) => {
        return api.put<{ message: string; data: OffreItem }>(`/offres/${id}/status`, { status });
    },
};
