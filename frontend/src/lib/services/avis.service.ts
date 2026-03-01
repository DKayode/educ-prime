import { api } from '../api';

export interface AvisItem {
    id: number;
    note: number;
    service_id: number;
    utilisateur_id: number;
    created_at: string;
    updated_at: string;
    commentaire?: string;
    commentaire_id?: number;
    utilisateurs?: {
        id: number;
        nom: string;
        prenom: string;
        photo?: string;
    };
}

export interface AvisResponse {
    data: AvisItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const avisService = {
    getAllByService: async (serviceId: number, params?: {
        page?: number;
        limit?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return api.get<AvisResponse>(`/avis/service/${serviceId}${queryString}`);
    },
};
