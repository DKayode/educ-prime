import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type ResourceType = 'epreuve' | 'concours' | 'examen_national';

/**
 * Append-only access log feeding KPI 16 (distinct learners who accessed an
 * épreuve/concours). Best-effort: a failed insert is logged and swallowed so
 * it never breaks the download it instruments. utilisateur_id may be null
 * (e.g. unauthenticated access) — the FK is ON DELETE SET NULL anyway.
 */
@Injectable()
export class ResourceAccessService {
  private readonly logger = new Logger(ResourceAccessService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async log(
    resourceType: ResourceType,
    resourceId: number,
    utilisateurId: number | null,
    pays: string,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO resource_access (utilisateur_id, resource_type, resource_id, pays)
         VALUES ($1, $2, $3, $4)`,
        [utilisateurId ?? null, resourceType, resourceId, pays],
      );
    } catch (err) {
      this.logger.warn(
        `resource_access log failed (${resourceType} #${resourceId}): ${err?.message ?? err}`,
      );
    }
  }
}
