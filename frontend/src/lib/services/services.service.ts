import { api } from '../api';

export interface ServiceItem {
    id: number;
    titre: string;
    description: string;
    localisation: string;
    utilisateur_id: number;
    prix?: number;
    type_id: number;
    status: 'pending_approval' | 'declined' | 'approved' | 'active' | 'inactive';
    delai?: number | null;
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
    prestataire?: {
        id: number;
        nom?: string;
        prenom?: string;
        domaine_competence?: string;
        bio?: string;
        site_web?: string;
        linkedin?: string;
        portfolio?: string;
        uuid?: string;
        utilisateur?: {
            id: number;
            uuid?: string;
            nom: string;
            prenom: string;
            email: string;
        };
        competences?: { id: number; nom: string; slug: string }[];
    };
}

export interface ServicesResponse {
    data: ServiceItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const servicesService = {
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
        return api.get<ServicesResponse>(`/services/all${queryString}`);
    },

    updateStatus: async (id: number, status: string) => {
        return api.put<{ message: string; data: ServiceItem }>(`/services/${id}/status`, { status });
    },
};
