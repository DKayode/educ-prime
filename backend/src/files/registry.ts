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
 * - `public` (optional, default false) routes uploads to the public R2 bucket
 *   and makes downloads return a deterministic anonymous URL with no expiry.
 *   Public slots also store that full URL directly in the `<slot>_path`
 *   column, so a plain entity GET carries a ready-to-use link and clients
 *   never need to call /files/.../download-url. Everything non-sensitive is
 *   public; the private slots (exam papers, concours papers, identity
 *   documents) stay on the presigned-URL flow where each read is
 *   authorized and short-lived.
 */
export interface FileSlotConfig {
    /** Absent on `virtual` slots — there is no Edukia row to write back to. */
    pathColumn?: string;
    extColumn?: string;
    /**
     * VIRTUAL entity — no backing table in the Edukia database. The service
     * presigns against the deterministic R2 key without looking up or updating
     * any row; the OWNING SERVICE (e.g. the Kessiah backend for
     * kessiah_documents) keeps path/extension in its own store and must pass
     * the extension explicitly on download-url. `uuid` is still required to be
     * a well-formed UUID so callers can't smuggle arbitrary R2 keys.
     */
    virtual?: boolean;
    authorized: readonly string[];
    public?: boolean;
    /**
     * Override for the presigned-PUT lifetime on this slot (seconds). Defaults
     * to the 10-min UPLOAD_PRESIGN_TTL_SECONDS. Large private PDFs (exam papers)
     * can take a while to push, so `epreuves.file` gets a 1-hour window.
     */
    uploadTtlSeconds?: number;
    /**
     * Override for the presigned-GET lifetime on this slot (seconds). Defaults
     * to PRESIGN_DOWNLOAD_TTL_SECONDS (10 min). Large private PDFs (exam and
     * concours papers) get a 1-hour window so the read link doesn't
     * expire mid-session. Clamped to the 7-day SigV4 max on resolution.
     */
    downloadTtlSeconds?: number;
    /**
     * TRANSITIONAL — Firebase↔R2 dual-write bridge. Name of the *legacy* column
     * the mobile app still reads (e.g. `epreuves.url`, `opportunites.image`).
     * When set, the file pipeline mirrors uploads into Firebase Storage and
     * writes the resulting public URL here, so a row created via the new R2
     * flow is still visible to mobile (and vice-versa). Slots with no legacy
     * column (categories.icone), no clean target (parcours.content,
     * publicites.content), or sensitive PII (prestataires.identity) leave this
     * unset and are not mirrored. Mapping mirrors scripts/migrate-firebase-to-r2.js.
     * Remove this field (and the mirror code) once mobile cuts over to R2.
     */
    legacyColumn?: string;
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const;
// Documents the Kessiah AI generates (plus their cached PDF previews).
const KESSIAH_DOC_EXTS = ['docx', 'xlsx', 'md', 'pdf'] as const;
// Photos a student attaches to a Kessiah conversation. Narrower than
// IMAGE_EXTS on purpose: the Kessiah backend re-encodes every upload to JPEG,
// or PNG when the image carries transparency, so nothing else can ever reach
// this slot. Accepting more would only widen what a caller may push.
const KESSIAH_CHAT_IMAGE_EXTS = ['jpg', 'png'] as const;
const IMAGE_EXTS_WITH_SVG = [...IMAGE_EXTS, 'svg'] as const;
const PDF_ONLY = ['pdf'] as const;
const IMAGE_OR_PDF = [...IMAGE_EXTS, 'pdf'] as const;

export const FILE_FIELD_REGISTRY: Record<string, Record<string, FileSlotConfig>> = {
    categories: {
        icone: { pathColumn: 'icone_path', extColumn: 'icone_extension', authorized: IMAGE_EXTS, public: true },
    },
    concours: {
        // Private: concours papers are gated behind authorized, short-lived reads.
        // 1-hour download window — concours PDFs are large, don't drop mid-session.
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY, legacyColumn: 'url', downloadTtlSeconds: 3600 },
    },
    concours_submissions: {
        // Private: pending user-submitted concours PDFs. Same shape as concours.file
        // — at approval the file is PROMOTED (server-side copy) into the real
        // concours's own key via FilesService.promoteFile.
        // TRANSITIONAL NOTE: step-2 uploads to this slot should go through the
        // PROXY endpoint (POST /files/concours_submissions/:uuid/file/upload), not
        // the presigned direct-PUT — the proxy is what mirrors the bytes to
        // Firebase and populates `url`, so the submission carries a Firebase URL
        // that promoteFile can copy forward before mobile cuts over to R2.
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY, legacyColumn: 'url', downloadTtlSeconds: 3600 },
    },
    epreuves: {
        // Private: exam papers are gated behind authorized, short-lived reads.
        // 1-hour upload + download window — exam PDFs are large and slow to push.
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY, legacyColumn: 'url', uploadTtlSeconds: 3600, downloadTtlSeconds: 3600 },
    },
    epreuve_submissions: {
        // STEP 2 of the user-submission flow. Same private/large-PDF profile as
        // epreuves.file; mirrors bytes to the submission's legacy `url` (Firebase).
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY, legacyColumn: 'url', uploadTtlSeconds: 3600, downloadTtlSeconds: 3600 },
    },
    examens_nationaux: {
        // Private national-exam PDFs (BAC/CAP/BEPC…). Same profile as concours.file.
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY, legacyColumn: 'url', uploadTtlSeconds: 3600, downloadTtlSeconds: 3600 },
    },
    examens_nationaux_submissions: {
        // Pending user-submitted national-exam PDFs; promoted into examens_nationaux.file at approval.
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: PDF_ONLY, legacyColumn: 'url', uploadTtlSeconds: 3600, downloadTtlSeconds: 3600 },
    },
    etablissements: {
        logo: { pathColumn: 'logo_path', extColumn: 'logo_extension', authorized: IMAGE_EXTS_WITH_SVG, public: true, legacyColumn: 'logo' },
    },
    evenements: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'image' },
    },
    kessiah_chat_images: {
        // Private, VIRTUAL: photos a student attaches to a Kessiah
        // conversation — a figure drawn by hand, a rough draft, an exercise
        // on paper. The uuid is the id of a Kessiah MessageAttachment, which
        // is never reused, so keys are never overwritten.
        //
        // Deliberately NOT folded into kessiah_documents: that slot holds what
        // the AI PRODUCES (docx/xlsx/md), this one holds what a student
        // SUBMITS. Sharing it would have meant widening its allowlist to
        // images, which is exactly the check that stops a caller from pushing
        // a picture where a document is expected.
        //
        // Private, like every slot carrying user-submitted content: a student's
        // photo of their own notebook must never be anonymously readable.
        // Default TTLs — these are small re-encoded images, not the multi-
        // megabyte PDFs that need the 1-hour windows below.
        file: { authorized: KESSIAH_CHAT_IMAGE_EXTS, virtual: true },
    },
    kessiah_documents: {
        // Private, VIRTUAL: documents generated by the Kessiah AI backend. The
        // uuid is the id of a Kessiah GeneratedDocument VERSION (immutable —
        // each edit creates a new id, so keys are never overwritten). Kessiah
        // owns all metadata; Edukia only presigns. 1-hour windows like
        // epreuves.file — generated docx/pdf can be pushed from a slow worker.
        file: { authorized: KESSIAH_DOC_EXTS, virtual: true, uploadTtlSeconds: 3600, downloadTtlSeconds: 3600 },
    },
    forums: {
        file: { pathColumn: 'file_path', extColumn: 'file_extension', authorized: IMAGE_OR_PDF, public: true, legacyColumn: 'photo' },
    },
    offres: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'image_couverture' },
    },
    opportunites: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'image' },
    },
    parcours: {
        covert: { pathColumn: 'covert_image_path', extColumn: 'covert_image_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'image_couverture' },
        // content has no clean legacy target (legacy `lien_video` is a video link) — not mirrored.
        content: { pathColumn: 'content_image_path', extColumn: 'content_image_extension', authorized: IMAGE_EXTS, public: true },
    },
    prestataires: {
        profil: { pathColumn: 'profil_photo_path', extColumn: 'profil_photo_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'photo_profil' },
        // Private: identity documents (ID card / passport scans) are sensitive
        // PII and must never be anonymously readable — intentionally not mirrored.
        identity: { pathColumn: 'identity_photo_path', extColumn: 'identity_photo_extension', authorized: IMAGE_EXTS },
    },
    publicites: {
        covert: { pathColumn: 'covert_image_path', extColumn: 'covert_image_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'image' },
        // content (legacy `media`) is sometimes a video — no clean image target, not mirrored.
        content: { pathColumn: 'content_image_path', extColumn: 'content_image_extension', authorized: IMAGE_EXTS, public: true },
    },
    recruteurs: {
        // Sibling of `prestataires.profil` — public profile photo, mirrored to
        // the legacy Firebase `photo_profil` column during the transition.
        profil: { pathColumn: 'profil_photo_path', extColumn: 'profil_photo_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'photo_profil' },
    },
    services: {
        image: { pathColumn: 'image_path', extColumn: 'image_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'image_couverture' },
    },
    type_profils: {
        // Public image slot — copied EXACTLY from categories.icone (same policy).
        icone: { pathColumn: 'icone_path', extColumn: 'icone_extension', authorized: IMAGE_EXTS, public: true },
    },
    utilisateurs: {
        profil: { pathColumn: 'profil_photo_path', extColumn: 'profil_photo_extension', authorized: IMAGE_EXTS, public: true, legacyColumn: 'photo' },
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
