import { api } from '../api';

/**
 * Generic client for the per-entity type-profil CHECKLIST endpoints
 * (GET/PUT /<entity>/:id/type-profils). Shared by all 5 admin pages so the
 * tagging round-trip isn't copied five times. `entity` is the backend route
 * segment: 'opportunites' | 'evenements' | 'forums' | 'services' | 'offres'.
 *
 * This is a SEPARATE side-call from an entity's own create/update body: after
 * the entity is created/updated (and you have its id), call `set` with the
 * selected ids.
 */
export const typeProfilTaggingService = {
    async get(entity: string, id: number | string): Promise<number[]> {
        const res = await api.get<{ typeProfilIds: number[] }>(`/${entity}/${id}/type-profils`);
        return res.typeProfilIds ?? [];
    },

    async set(entity: string, id: number | string, typeProfilIds: number[]): Promise<number[]> {
        const res = await api.put<{ typeProfilIds: number[] }>(`/${entity}/${id}/type-profils`, { typeProfilIds });
        return res.typeProfilIds ?? [];
    },
};
