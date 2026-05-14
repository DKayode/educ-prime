import { api } from '../api';

export type Slot =
    | 'icone' | 'file' | 'logo' | 'image'
    | 'covert' | 'content'
    | 'profil' | 'identity';

export interface UploadUrlResponse {
    url: string;
    method: 'PUT';
    content_type: string;
    path: string;        // logical /<entity>/<uuid>/<slot>
    extension: string;
    expires_in: number;  // 0 for public slots (deterministic anonymous URL)
    public: boolean;
}

export interface DownloadUrlResponse {
    url: string;
    method: 'GET';
    path: string;
    extension: string;
    expires_in: number;  // 0 for public slots (URL never expires)
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
     * Get a presigned GET URL for the file currently registered on this slot.
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
     * One-shot upload: fetch the presigned URL, PUT bytes to R2, return the
     * server-side path. Throws if either step fails.
     *
     * The browser must be allowed to talk to R2 directly (CORS on the bucket
     * must allow PUT from the admin origin) — Cloudflare R2 buckets default
     * to public-read of presigned URLs but require per-origin CORS for PUT.
     */
    async uploadFile(entity: string, uuid: string, slot: Slot, file: File): Promise<UploadUrlResponse> {
        const extension = (file.name.split('.').pop() ?? '').toLowerCase();
        if (!extension) {
            throw new Error(`Cannot determine extension from filename "${file.name}".`);
        }
        const presigned = await filesService.getUploadUrl(entity, uuid, slot, extension);

        const r = await fetch(presigned.url, {
            method: 'PUT',
            headers: { 'Content-Type': presigned.content_type },
            body: file,
        });
        if (!r.ok) {
            const text = await r.text().catch(() => '');
            throw new Error(`R2 upload failed (${r.status}): ${text || r.statusText}`);
        }
        return presigned;
    },
};
