import {
    Injectable,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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

const PRESIGN_TTL_SECONDS = 5 * 60; // 5 minutes — enough for the client to start the upload.
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

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly config: ConfigService,
    ) {
        const endpoint = this.config.get<string>('R2_ENDPOINT');
        const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
        this.bucket = this.config.get<string>('R2_BUCKET') ?? '';
        this.publicBucket = this.config.get<string>('R2_PUBLIC_BUCKET') ?? '';
        // Strip trailing slash so concatenation with the key is idempotent.
        this.publicBaseUrl = (this.config.get<string>('R2_PUBLIC_BUCKET_URL') ?? '').replace(/\/+$/, '');

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
        const url = await getSignedUrl(this.client, command, { expiresIn: PRESIGN_TTL_SECONDS });

        await this.writePathOnRow(entity, rowId, cfg, storedPath, extension);

        return {
            url,
            method: 'PUT',
            content_type: contentType,
            path: storedPath,
            extension,
            expires_in: PRESIGN_TTL_SECONDS,
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
        const url = await getSignedUrl(this.client, command, { expiresIn: PRESIGN_TTL_SECONDS });
        return {
            url,
            method: 'GET' as const,
            path: row.path,
            extension: row.ext,
            expires_in: PRESIGN_TTL_SECONDS,
            public: false,
        };
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

        return { path: storedPath, extension, public: !!cfg.public };
    }
}
