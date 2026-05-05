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
import {
    FILE_FIELD_REGISTRY,
    FileSlotConfig,
    buildLogicalPath,
    buildObjectKey,
    getSlotConfig,
} from './registry';

const PRESIGN_TTL_SECONDS = 5 * 60; // 5 minutes — enough for the client to start the upload.
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

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {
        const endpoint = process.env.R2_ENDPOINT;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        this.bucket = process.env.R2_BUCKET ?? '';

        if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucket) {
            this.logger.warn(
                'R2 storage is not fully configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET to enable presign endpoints.',
            );
        }

        this.client = new S3Client({
            region: 'auto',
            endpoint,
            credentials: { accessKeyId: accessKeyId ?? '', secretAccessKey: secretAccessKey ?? '' },
        });
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
     * which clients can detect via download-url returning 404.
     */
    async createUploadUrl(entity: string, uuid: string, slot: string, rawExtension: string) {
        const cfg = this.resolveSlot(entity, slot);
        const extension = this.validateExtension(cfg, rawExtension);
        const rowId = await this.findRowIdByUuid(entity, uuid);

        const path = buildLogicalPath(entity, uuid, slot);
        const key = buildObjectKey(entity, uuid, slot, extension);
        const contentType = MIME_BY_EXT[extension] ?? 'application/octet-stream';

        if (!this.bucket) {
            throw new InternalServerErrorException('R2 bucket is not configured.');
        }

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        const url = await getSignedUrl(this.client, command, { expiresIn: PRESIGN_TTL_SECONDS });

        await this.writePathOnRow(entity, rowId, cfg, path, extension);

        return {
            url,
            method: 'PUT',
            content_type: contentType,
            path,
            extension,
            expires_in: PRESIGN_TTL_SECONDS,
        };
    }

    /**
     * Issue a presigned GET URL pointing at whatever path/extension the row
     * currently has. Throws 404 if the row exists but no file has been
     * registered yet.
     */
    async createDownloadUrl(entity: string, uuid: string, slot: string) {
        const cfg = this.resolveSlot(entity, slot);
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

        if (!this.bucket) {
            throw new InternalServerErrorException('R2 bucket is not configured.');
        }

        const key = buildObjectKey(entity, uuid, slot, row.ext);
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        const url = await getSignedUrl(this.client, command, { expiresIn: PRESIGN_TTL_SECONDS });

        return {
            url,
            method: 'GET',
            path: row.path,
            extension: row.ext,
            expires_in: PRESIGN_TTL_SECONDS,
        };
    }

    /**
     * Server-proxied upload (fallback for clients that can't or don't want
     * to use the presigned PUT URL flow). Streams the multipart payload
     * straight to R2 with a normal PutObject.
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

        const path = buildLogicalPath(entity, uuid, slot);
        const key = buildObjectKey(entity, uuid, slot, extension);

        if (!this.bucket) {
            throw new InternalServerErrorException('R2 bucket is not configured.');
        }

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype || MIME_BY_EXT[extension] || 'application/octet-stream',
            }),
        );

        await this.writePathOnRow(entity, rowId, cfg, path, extension);

        return { path, extension };
    }
}
