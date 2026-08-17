import { api } from '../api';

export type Slot =
    | 'icone' | 'file' | 'logo' | 'image'
    | 'covert' | 'content'
    | 'profil' | 'identity';

export interface UploadUrlResponse {
    url: string;
    method: 'PUT';
    content_type: string;
    // Exact headers that MUST be replayed on the PUT — the backend signs these
    // into the presigned URL. Public slots include Cache-Control; sending only
    // Content-Type would make R2 reject the PUT with SignatureDoesNotMatch.
    required_headers: Record<string, string>;
    // Private slots: logical /<entity>/<uuid>/<slot>. Public slots: the full
    // anonymous URL — it's stored verbatim in the row's <slot>_path column, so
    // a plain entity GET already carries a usable link (no download-url call).
    path: string;
    extension: string;
    expires_in: number;  // 0 for public slots (deterministic anonymous URL)
    public: boolean;
}

export interface DownloadUrlResponse {
    url: string;
    method: 'GET';
    path: string;        // public slots: full URL (same as `url`); private: logical path
    extension: string;
    expires_in: number;  // 0 for public slots (URL never expires)
    public: boolean;
}

// Response from the server-proxied /upload endpoint.
export interface UploadResponse {
    // Public slots: full anonymous URL (stored on the row). Private: logical path.
    path: string;
    extension: string;
    public: boolean;
}

export type FileRegistry = Record<string, Record<string, { authorized: string[]; public: boolean }>>;

export const filesService = {
    /**
     * Discover supported (entity, slot) pairs and their extension allowlists.
     * Cache this per session — it changes rarely.
     */
    async getRegistry(): Promise<FileRegistry> {
        return api.get<FileRegistry>('/files/registry');
    },

    /**
     * Step 1 of the upload flow: ask the backend for a presigned PUT URL.
     */
    async getUploadUrl(entity: string, uuid: string, slot: Slot, extension: string): Promise<UploadUrlResponse> {
        return api.post<UploadUrlResponse>(`/files/${entity}/${uuid}/${slot}/upload-url`, { extension });
    },

    /**
     * Get a presigned GET URL for a PRIVATE slot's file. Public slots don't
     * use this — their URL lives on the entity row's `<slot>_path` field and a
     * plain GET serves the file (the backend returns 400 if called for one).
     * Returns null if no file has been uploaded yet (404 from backend).
     */
    async getDownloadUrl(entity: string, uuid: string, slot: Slot): Promise<DownloadUrlResponse | null> {
        try {
            return await api.get<DownloadUrlResponse>(`/files/${entity}/${uuid}/${slot}/download-url`);
        } catch (err: any) {
            if (err?.statusCode === 404) return null;
            throw err;
        }
    },

    /**
     * Les octets du fichier, servis par notre API plutôt que par R2.
     *
     * Une URL présignée suffit à OUVRIR un document dans un onglet — une
     * navigation n'est pas soumise au CORS. Elle ne suffit pas à l'AFFICHER
     * dans la page : le lecteur PDF télécharge en `fetch`, que le navigateur
     * bloque faute d'en-tête `Access-Control-Allow-Origin` sur le bucket.
     *
     * Le relais passe par `api.download`, qui joint le jeton d'authentification
     * — la route est protégée, un `fetch` nu de react-pdf recevrait un 401.
     *
     * Renvoie null si aucun fichier n'est enregistré : l'appelant dégrade vers
     * la seule transcription au lieu de bloquer l'écran.
     */
    async getContentBlob(entity: string, uuid: string, slot: Slot): Promise<Blob | null> {
        try {
            return await api.download(`/files/${entity}/${uuid}/${slot}/content`);
        } catch (err: any) {
            if (err?.statusCode === 404) return null;
            throw err;
        }
    },

    /**
     * One-shot upload via the server-proxied endpoint: POST the file as
     * multipart/form-data; the backend streams it to R2 and returns the stored
     * path. Throws if the upload fails.
     *
     * TRANSITIONAL: we route through the proxy (rather than a presigned direct-
     * to-R2 PUT) so the backend holds the bytes and can mirror them into
     * Firebase Storage for the mobile app, which still reads the legacy URL
     * columns. Once mobile cuts over to R2, this can revert to the presigned
     * `getUploadUrl` + direct PUT flow (still available on the backend).
     */
    async uploadFile(entity: string, uuid: string, slot: Slot, file: File): Promise<UploadResponse> {
        const form = new FormData();
        form.append('file', file);
        return api.post<UploadResponse>(`/files/${entity}/${uuid}/${slot}/upload`, form);
    },
};
