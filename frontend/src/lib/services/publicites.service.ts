import { api } from '../api';

export interface Publicite {
    id: number;
    titre: string;
    image_video?: string;
    lien?: string;
    ordre: number;
    actif: boolean;
    date_creation: string;
}

export const publicitesService = {
    async getAll(): Promise<Publicite[]> {
        return api.get<Publicite[]>('/publicites');
    },

    async getById(id: string): Promise<Publicite> {
        return api.get<Publicite>(`/publicites/${id}`);
    },

    async create(data: {
        titre: string;
        image_video?: string;
        lien?: string;
        ordre?: number;
        actif?: boolean;
    }): Promise<Publicite> {
        return api.post<Publicite>('/publicites', data);
    },

    async update(id: string, data: Partial<{
        titre: string;
        image_video: string;
        lien: string;
        ordre: number;
        actif: boolean;
    }>): Promise<Publicite> {
        return api.put<Publicite>(`/publicites/${id}`, data);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/publicites/${id}`);
    },
};
