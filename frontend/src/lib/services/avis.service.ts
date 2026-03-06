import { api } from '../api';

export interface AvisItem {
    id: number;
    note: number;
    avisable_id: number;
    avisable_type: "SERVICE" | "OFFRE";
    created_at: string;
    updated_at: string;
    commentaire?: string;
    utilisateur?: {
        id: number;
        ui: string;
        nom: string;
        prenom: string;
        email: string;
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
    getAllByModel: async (model: 'Services' | 'Offres', id: number, params?: {
        page?: number;
        limit?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return api.get<AvisResponse>(`/avis/${model}/${id}${queryString}`);
    },
};
