/**
 * Per-entity file slot registry. Drives validation, R2 key construction, and
 * which DB columns the FilesService writes back to.
 *
 * - `entity` is the table name (= URL segment).
 * - `slot` is the URL segment after `/:uuid/` (e.g. `/categories/:uuid/icone`).
 *   Multiple slots per entity are allowed (parcours has covert + content).
 * - `pathColumn` / `extColumn` are the TypeORM/Postgres columns the service
 *   updates after generating a presigned URL.
 * - `authorized` is the allowlist of file extensions accepted on this slot.
 */
export interface FileSlotConfig {
    pathColumn: string;
    extColumn: string;
    authorized: readonly string[];
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const;
const IMAGE_EXTS_WITH_SVG = [...IMAGE_EXTS, 'svg'] as const;
const PDF_ONLY = ['pdf'] as const;
const IMAGE_OR_PDF = [...IMAGE_EXTS, 'pdf'] as const;

export const FILE_FIELD_REGISTRY: Record<string, Record<string, FileSlotConfig>> = {
    categories: {
        icone: { pathColumn: 'icone_path', extColumn: 'icone_extension', authorized: IMAGE_EXTS },
    },
    concours: {
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY },
    },
    epreuves: {
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY },
    },
    etablissements: {
        logo: { pathColumn: 'logo_path', extColumn: 'logo_extension', authorized: IMAGE_EXTS_WITH_SVG },
    },
    evenements: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS },
    },
    forums: {
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: IMAGE_OR_PDF },
    },
    offres: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS },
    },
    opportunites: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS },
    },
    parcours: {
        covert: { pathColumn: 'covert_image_path', extColumn: 'covert_image_extension', authorized: IMAGE_EXTS },
        content: { pathColumn: 'content_image_path', extColumn: 'content_image_extension', authorized: IMAGE_EXTS },
    },
    prestataires: {
        profil: { pathColumn: 'profil_photo_path', extColumn: 'profil_photo_extension', authorized: IMAGE_EXTS },
        identity: { pathColumn: 'identity_photo_path', extColumn: 'identity_photo_extension', authorized: IMAGE_EXTS },
    },
    publicites: {
        covert: { pathColumn: 'covert_image_path', extColumn: 'covert_image_extension', authorized: IMAGE_EXTS },
        content: { pathColumn: 'content_image_path', extColumn: 'content_image_extension', authorized: IMAGE_EXTS },
    },
    ressources: {
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY },
    },
    services: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS },
    },
    utilisateurs: {
        profil: { pathColumn: 'profil_photo_path', extColumn: 'profil_photo_extension', authorized: IMAGE_EXTS },
    },
};

export function getSlotConfig(entity: string, slot: string): FileSlotConfig | null {
    const e = FILE_FIELD_REGISTRY[entity];
    if (!e) return null;
    return e[slot] ?? null;
}

/**
 * Logical path written to the entity row's <field>_path column. Stable across
 * uploads; doesn't include the extension (which lives in <field>_extension).
 */
export function buildLogicalPath(entity: string, uuid: string, slot: string): string {
    return `/${entity}/${uuid}/${slot}`;
}

/**
 * Actual R2 object key. Includes extension so different file types don't
 * collide on the same logical path during a re-upload.
 */
export function buildObjectKey(entity: string, uuid: string, slot: string, extension: string): string {
    return `${entity}/${uuid}/${slot}.${extension.toLowerCase()}`;
}
