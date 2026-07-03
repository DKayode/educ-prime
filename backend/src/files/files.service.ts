import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
    FILE_FIELD_REGISTRY,
    FileSlotConfig,
    buildLogicalPath,
    buildObjectKey,
    getSlotConfig,
} from './registry';

// TTL for presigned PUT URLs — enough for the client to request the URL and
// push the bytes without the link expiring mid-upload.
const UPLOAD_PRESIGN_TTL_SECONDS = 10 * 60; // 10 minutes
// TTL for presigned GET URLs on PRIVATE slots. Default kept in lockstep with
// the upload window (10 min) so both `expires_in` values the client sees are
// consistent. Overridable via PRESIGN_DOWNLOAD_TTL_SECONDS for ops that want
// longer-lived read links.
const DOWNLOAD_PRESIGN_TTL_SECONDS_DEFAULT = 10 * 60; // 10 minutes
// R2/S3 SigV4 hard ceiling for presigned-URL lifetimes. Every resolved TTL
// (env override or per-slot registry override) is clamped to this.
const MAX_S3_PRESIGN_TTL = 7 * 24 * 60 * 60; // 604800s — SigV4 ceiling
// Cache-Control written on PUT for public-bucket objects. R2 keys are
// content-addressed by uuid, so a fresh upload always changes either the
// (entity, uuid, slot) or extension — making `immutable` safe.
const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const MIME_BY_EXT: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
};

@Injectable()
export class FilesService {
    private readonly logger = new Logger(FilesService.name);
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicBucket: string;
    private readonly publicBaseUrl: string;
    private readonly downloadTtlSeconds: number;

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly config: ConfigService,
        // TRANSITIONAL: used to mirror uploads into Firebase Storage so the
        // mobile app (still reading legacy URL columns) sees R2-created rows.
        // Injected by class so FilesModule doesn't depend on FichiersModule.
        @Inject('FirebaseConfig') private readonly firebase: any,
    ) {
        const endpoint = this.config.get<string>('R2_ENDPOINT');
        const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
        this.bucket = this.config.get<string>('R2_BUCKET') ?? '';
        this.publicBucket = this.config.get<string>('R2_PUBLIC_BUCKET') ?? '';
        // Strip trailing slash so concatenation with the key is idempotent.
        this.publicBaseUrl = (this.config.get<string>('R2_PUBLIC_BUCKET_URL') ?? '').replace(/\/+$/, '');

        // Presigned-GET lifetime for private slots. Configurable so ops can
        // tune it without a redeploy; falls back to the 6h default. Clamp to
        // R2/S3 SigV4's hard maximum of 7 days.
        const ttlRaw = Number(this.config.get<string>('PRESIGN_DOWNLOAD_TTL_SECONDS'));
        this.downloadTtlSeconds =
            Number.isFinite(ttlRaw) && ttlRaw > 0
                ? Math.min(ttlRaw, MAX_S3_PRESIGN_TTL)
                : DOWNLOAD_PRESIGN_TTL_SECONDS_DEFAULT;

        this.logger.log(
            `R2 config: endpoint=${endpoint ? 'set' : 'MISSING'}, ` +
            `bucket=${this.bucket ? 'set' : 'MISSING'}, ` +
            `publicBucket=${this.publicBucket ? 'set' : 'MISSING'}, ` +
            `publicBaseUrl=${this.publicBaseUrl ? 'set' : 'MISSING'}, ` +
            `accessKeyId=${accessKeyId ? 'set' : 'MISSING'}, ` +
            `secretAccessKey=${secretAccessKey ? 'set' : 'MISSING'}`,
        );

        if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucket) {
            this.logger.warn(
                'R2 storage is not fully configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET to enable presign endpoints.',
            );
        }
        if (!this.publicBucket || !this.publicBaseUrl) {
            this.logger.warn(
                'R2 public bucket is not configured. Set R2_PUBLIC_BUCKET + R2_PUBLIC_BUCKET_URL to enable public-flagged slots.',
            );
        }

        this.client = new S3Client({
            region: 'auto',
            endpoint,
            credentials: { accessKeyId: accessKeyId ?? '', secretAccessKey: secretAccessKey ?? '' },
        });
    }

    /**
     * Public-safe view of the registry. Strips internal fields (DB column
     * names) and only exposes what a client needs to construct calls and
     * pick a valid extension.
     */
    getPublicRegistry(): Record<string, Record<string, { authorized: readonly string[]; public: boolean }>> {
        const out: Record<string, Record<string, { authorized: readonly string[]; public: boolean }>> = {};
        for (const [entity, slots] of Object.entries(FILE_FIELD_REGISTRY)) {
            out[entity] = {};
            for (const [slot, cfg] of Object.entries(slots)) {
                out[entity][slot] = { authorized: cfg.authorized, public: !!cfg.public };
            }
        }
        return out;
    }

    private resolveSlot(entity: string, slot: string): FileSlotConfig {
        const cfg = getSlotConfig(entity, slot);
        if (!cfg) {
            const known = Object.keys(FILE_FIELD_REGISTRY).join(', ');
            throw new NotFoundException(
                `Unknown file slot '${entity}/${slot}'. Known entities: ${known}.`,
            );
        }
        return cfg;
    }

    /** Resolve the bucket name to use for this slot's writes/reads. */
    private bucketFor(cfg: FileSlotConfig): string {
        if (cfg.public) {
            if (!this.publicBucket) {
                throw new InternalServerErrorException(
                    'R2 public bucket is not configured but slot is flagged public.',
                );
            }
            return this.publicBucket;
        }
        if (!this.bucket) {
            throw new InternalServerErrorException('R2 bucket is not configured.');
        }
        return this.bucket;
    }

    /** Anonymous read URL for a public-bucket object. */
    private publicUrl(key: string): string {
        if (!this.publicBaseUrl) {
            throw new InternalServerErrorException('R2_PUBLIC_BUCKET_URL is not configured.');
        }
        return `${this.publicBaseUrl}/${key}`;
    }

    /**
     * Value written to the row's <slot>_path column. Private slots store the
     * logical path (`/<entity>/<uuid>/<slot>`) and reconstruct the R2 key on
     * read; public slots store the full anonymous URL so a plain entity GET
     * already carries a ready-to-use link with no /files/... round trip.
     * Trade-off: if R2_PUBLIC_BUCKET_URL ever changes, public rows need a
     * re-backfill (scripts/backfill-public-urls.js).
     */
    private storedPathFor(cfg: FileSlotConfig, entity: string, uuid: string, slot: string, extension: string): string {
        if (cfg.public) {
            return this.publicUrl(buildObjectKey(entity, uuid, slot, extension));
        }
        return buildLogicalPath(entity, uuid, slot);
    }

    private validateExtension(cfg: FileSlotConfig, extension: string) {
        const normalized = extension.toLowerCase().replace(/^\./, '');
        if (!cfg.authorized.includes(normalized)) {
            throw new BadRequestException(
                `Extension '${normalized}' is not allowed. Authorized: ${cfg.authorized.join(', ')}.`,
            );
        }
        return normalized;
    }

    /**
     * Looks up the row by uuid for the given entity table, returning its
     * primary key (id) so we can later UPDATE the path/extension columns.
     * Throws 404 if no row matches.
     */
    private async findRowIdByUuid(entity: string, uuid: string): Promise<number> {
        const rows = await this.dataSource.query(
            `SELECT id FROM "${entity}" WHERE uuid = $1 LIMIT 1`,
            [uuid],
        );
        if (!rows.length) {
            throw new NotFoundException(`No ${entity} found with uuid ${uuid}.`);
        }
        return rows[0].id;
    }

    /**
     * Persist the new path + extension on the entity row. The path is
     * deterministic from (entity, uuid, slot), so re-uploads overwrite the
     * same logical key.
     */
    private async writePathOnRow(
        entity: string,
        rowId: number,
        cfg: FileSlotConfig,
        path: string,
        extension: string,
    ) {
        await this.dataSource.query(
            `UPDATE "${entity}" SET "${cfg.pathColumn}" = $1, "${cfg.extColumn}" = $2 WHERE id = $3`,
            [path, extension, rowId],
        );
    }

    /**
     * Issue a presigned PUT URL the client can use to upload directly to R2.
     * Optimistically writes path/extension on the row at presign time — if
     * the upload never lands, the column points at a non-existent object,
     * which clients can detect via download-url returning 404. Public-
     * flagged slots route to the public bucket, tag the object with a long
     * Cache-Control so CDNs can cache aggressively, and store the full
     * anonymous URL in <slot>_path (clients read it straight off the row).
     */
    async createUploadUrl(entity: string, uuid: string, slot: string, rawExtension: string) {
        const cfg = this.resolveSlot(entity, slot);
        const extension = this.validateExtension(cfg, rawExtension);
        const rowId = await this.findRowIdByUuid(entity, uuid);

        const storedPath = this.storedPathFor(cfg, entity, uuid, slot, extension);
        const key = buildObjectKey(entity, uuid, slot, extension);
        const contentType = MIME_BY_EXT[extension] ?? 'application/octet-stream';
        const bucket = this.bucketFor(cfg);

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
            ...(cfg.public ? { CacheControl: PUBLIC_CACHE_CONTROL } : {}),
        });
        const uploadTtl = cfg.uploadTtlSeconds ?? UPLOAD_PRESIGN_TTL_SECONDS;
        const url = await getSignedUrl(this.client, command, { expiresIn: uploadTtl });

        await this.writePathOnRow(entity, rowId, cfg, storedPath, extension);

        return {
            url,
            method: 'PUT',
            content_type: contentType,
            // Echo back what the client must send on the PUT so the signature
            // matches. For public slots we sign Cache-Control too — the client
            // MUST replay it or R2 returns SignatureDoesNotMatch.
            required_headers: {
                'Content-Type': contentType,
                ...(cfg.public ? { 'Cache-Control': PUBLIC_CACHE_CONTROL } : {}),
            },
            path: storedPath,
            extension,
            expires_in: uploadTtl,
            public: !!cfg.public,
        };
    }

    /**
     * Return a short-lived presigned GET URL for a PRIVATE slot's file.
     * Public slots don't go through here: their full anonymous URL is stored
     * on the entity's <slot>_path field and served directly over a plain GET,
     * so calling this for a public slot is a 400. Throws 404 if no file has
     * been registered yet.
     */
    async createDownloadUrl(entity: string, uuid: string, slot: string) {
        const cfg = this.resolveSlot(entity, slot);
        if (cfg.public) {
            throw new BadRequestException(
                `Slot '${entity}/${slot}' is public — no presigned download URL is ` +
                `issued. Read its URL straight from the entity's '${cfg.pathColumn}' ` +
                `field; a plain GET on that URL serves the file.`,
            );
        }
        const rowId = await this.findRowIdByUuid(entity, uuid);

        const rows = await this.dataSource.query(
            `SELECT "${cfg.pathColumn}" AS path, "${cfg.extColumn}" AS ext FROM "${entity}" WHERE id = $1`,
            [rowId],
        );
        const row = rows[0];
        if (!row || !row.path || !row.ext) {
            throw new NotFoundException(
                `No file registered yet on ${entity}/${uuid}/${slot}. Upload one first.`,
            );
        }

        const key = buildObjectKey(entity, uuid, slot, row.ext);
        const command = new GetObjectCommand({ Bucket: this.bucketFor(cfg), Key: key });
        // Per-slot override (e.g. 1h for large exam/concours/resource PDFs)
        // falls back to the env-tuned default; clamp to the SigV4 ceiling.
        const downloadTtl = Math.min(cfg.downloadTtlSeconds ?? this.downloadTtlSeconds, MAX_S3_PRESIGN_TTL);
        const url = await getSignedUrl(this.client, command, { expiresIn: downloadTtl });
        return {
            url,
            method: 'GET' as const,
            path: row.path,
            extension: row.ext,
            expires_in: downloadTtl,
            public: false,
        };
    }

    /**
     * Promote a slot's object from one (entity, uuid) to another under the SAME
     * slot — a server-side copy, no bytes through the API. Used when a pending
     * submission is approved: the real concours should OWN its file at its own
     * deterministic key (`concours/<concours_uuid>/file.pdf`) instead of
     * borrowing the submission's, so submissions can be cleaned up later.
     *
     * R2 copy is canonical — if it throws, the caller's operation fails. The
     * Firebase copy is TRANSITIONAL + best-effort (logged, never thrown) so the
     * mobile app still sees a legacy URL under the destination key. Source
     * objects are left in place (cleanup is out of scope).
     */
    async promoteFile(
        srcEntity: string,
        srcUuid: string,
        destEntity: string,
        destUuid: string,
        slot: string,
        extension: string,
    ): Promise<{ file_path: string; file_extension: string; url: string }> {
        const cfg = this.resolveSlot(destEntity, slot);
        const ext = extension.toLowerCase().replace(/^\./, '');
        const bucket = this.bucketFor(cfg);
        const srcKey = buildObjectKey(srcEntity, srcUuid, slot, ext);
        const destKey = buildObjectKey(destEntity, destUuid, slot, ext);

        // R2 server-side copy (canonical — propagate failure to the caller).
        await this.client.send(
            new CopyObjectCommand({
                Bucket: bucket,
                CopySource: encodeURIComponent(`${bucket}/${srcKey}`),
                Key: destKey,
                ...(cfg.public ? { CacheControl: PUBLIC_CACHE_CONTROL } : {}),
            }),
        );

        const file_path = this.storedPathFor(cfg, destEntity, destUuid, slot, ext);

        // TRANSITIONAL Firebase copy (best-effort) so the legacy URL points at
        // the destination key too. Mirrors mirrorToFirebase's URL convention.
        let url = '';
        if (cfg.legacyColumn) {
            try {
                const fb = this.firebase.getBucket();
                await fb.file(srcKey).copy(fb.file(destKey));
                url = `https://storage.googleapis.com/${fb.name}/${destKey}`;
                this.logger.log(`Promoted ${srcEntity}/${srcUuid}/${slot} → ${destEntity}/${destUuid}/${slot} on Firebase.`);
            } catch (err) {
                this.logger.warn(
                    `Firebase promote failed for ${destEntity}/${destUuid}/${slot}: ${err?.message ?? err}`,
                );
            }
        }

        this.logger.log(`Promoted ${srcEntity}/${srcUuid}/${slot} → ${destEntity}/${destUuid}/${slot} on R2 (${destKey}).`);
        return { file_path, file_extension: ext, url };
    }

    /**
     * Server-proxied upload (fallback for clients that can't or don't want
     * to use the presigned PUT URL flow). Streams the multipart payload
     * straight to R2 with a normal PutObject. Same bucket-routing rules as
     * createUploadUrl.
     */
    async proxyUpload(
        entity: string,
        uuid: string,
        slot: string,
        file: { buffer: Buffer; originalname: string; mimetype: string },
    ) {
        const cfg = this.resolveSlot(entity, slot);
        const extFromName = (file.originalname.split('.').pop() ?? '').toLowerCase();
        const extension = this.validateExtension(cfg, extFromName);
        const rowId = await this.findRowIdByUuid(entity, uuid);

        const storedPath = this.storedPathFor(cfg, entity, uuid, slot, extension);
        const key = buildObjectKey(entity, uuid, slot, extension);
        const bucket = this.bucketFor(cfg);

        await this.client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype || MIME_BY_EXT[extension] || 'application/octet-stream',
                ...(cfg.public ? { CacheControl: PUBLIC_CACHE_CONTROL } : {}),
            }),
        );

        await this.writePathOnRow(entity, rowId, cfg, storedPath, extension);

        // TRANSITIONAL: also push to Firebase + write the legacy URL column so
        // the mobile app sees this file. Best-effort — a Firebase hiccup must
        // not fail an upload that already succeeded against R2 (canonical).
        await this.mirrorToFirebase(entity, uuid, slot, cfg, rowId, file.buffer, extension, file.mimetype);

        return { path: storedPath, extension, public: !!cfg.public };
    }

    /**
     * TRANSITIONAL Firebase mirror (R2 → Firebase). Pushes the just-uploaded
     * bytes to Firebase Storage under <entity>/<uuid>/<slot>.<ext> and writes
     * the resulting public URL into the slot's legacy column, so the mobile
     * app (which still reads those columns) sees R2-created files. No-op for
     * slots without a legacyColumn (categories.icone, PII identity, the
     * content slots). Best-effort: failures are logged, never thrown.
     * Remove together with the `legacyColumn` registry field post-migration.
     */
    private async mirrorToFirebase(
        entity: string,
        uuid: string,
        slot: string,
        cfg: FileSlotConfig,
        rowId: number,
        buffer: Buffer,
        extension: string,
        mimetype: string,
    ): Promise<void> {
        if (!cfg.legacyColumn) return;
        try {
            const bucket = this.firebase.getBucket();
            const key = buildObjectKey(entity, uuid, slot, extension);
            await bucket.file(key).save(buffer, {
                metadata: { contentType: mimetype || MIME_BY_EXT[extension] || 'application/octet-stream' },
            });
            const url = `https://storage.googleapis.com/${bucket.name}/${key}`;
            await this.dataSource.query(
                `UPDATE "${entity}" SET "${cfg.legacyColumn}" = $1 WHERE id = $2`,
                [url, rowId],
            );
            this.logger.log(`Mirrored ${entity}/${uuid}/${slot} → Firebase (${cfg.legacyColumn}).`);
        } catch (err) {
            this.logger.warn(
                `Firebase mirror failed for ${entity}/${uuid}/${slot}: ${err?.message ?? err}`,
            );
        }
    }

    /**
     * TRANSITIONAL R2 mirror (Firebase → R2). Called by the legacy FichiersService
     * after a Firebase upload: pushes the same bytes to the correct R2 bucket
     * and writes the new <slot>_path / <slot>_extension columns, so a row
     * created via the legacy mobile flow is also visible to the admin/web R2
     * pipeline. Resolves the row uuid from its numeric id (the legacy service
     * works in ids). Best-effort: unknown slot, bad extension, missing row, or
     * an R2 error are logged and swallowed — never break the legacy upload.
     * Remove post-migration.
     */
    async mirrorLegacyToR2(
        entity: string,
        slot: string,
        rowId: number,
        file: { buffer: Buffer; extension: string; mimetype?: string },
    ): Promise<void> {
        try {
            const cfg = getSlotConfig(entity, slot);
            if (!cfg) return;
            const extension = file.extension.toLowerCase().replace(/^\./, '');
            if (!cfg.authorized.includes(extension)) {
                this.logger.warn(
                    `R2 mirror skipped for ${entity}/${slot}: extension '${extension}' not authorized.`,
                );
                return;
            }
            const rows = await this.dataSource.query(
                `SELECT uuid FROM "${entity}" WHERE id = $1 LIMIT 1`,
                [rowId],
            );
            const uuid = rows[0]?.uuid;
            if (!uuid) {
                this.logger.warn(`R2 mirror skipped: no ${entity} row with id ${rowId}.`);
                return;
            }

            const key = buildObjectKey(entity, uuid, slot, extension);
            const bucket = this.bucketFor(cfg);
            await this.client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype || MIME_BY_EXT[extension] || 'application/octet-stream',
                    ...(cfg.public ? { CacheControl: PUBLIC_CACHE_CONTROL } : {}),
                }),
            );
            const storedPath = this.storedPathFor(cfg, entity, uuid, slot, extension);
            await this.writePathOnRow(entity, rowId, cfg, storedPath, extension);
            this.logger.log(`Mirrored ${entity}/${uuid}/${slot} → R2 (${cfg.pathColumn}).`);
        } catch (err) {
            this.logger.warn(
                `R2 mirror failed for ${entity} id=${rowId} slot=${slot}: ${err?.message ?? err}`,
            );
        }
    }

}
