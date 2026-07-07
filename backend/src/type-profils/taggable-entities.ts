// The 5 content entities whose audience is gated by a type_profil via the registry
// (entity_type_profil). Canonical singular names, matching the legacy join-table prefix.
export const TAGGABLE_ENTITIES = ['evenement', 'opportunite', 'forum', 'service', 'offre'] as const;
export type TaggableEntity = (typeof TAGGABLE_ENTITIES)[number];
