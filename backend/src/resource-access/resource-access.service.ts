import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Ressources académiques d'un côté, fiches de module de l'autre. La distinction
 * compte pour les KPI : les premières mesurent l'usage pédagogique, les
 * secondes l'intérêt porté aux autres modules (#260).
 */
export type ResourceAcademique = 'epreuve' | 'concours' | 'examen_national';

export type ResourceModule =
  | 'opportunite'
  | 'offre'
  | 'service'
  | 'evenement'
  | 'parcours'
  | 'forum'
  | 'publicite';

export type ResourceType = ResourceAcademique | ResourceModule;

/** Les modules dont la consultation alimente la section « Audience » des KPI. */
export const MODULES_SUIVIS: ResourceModule[] = [
  'opportunite', 'offre', 'service', 'evenement', 'parcours', 'forum', 'publicite',
];

/**
 * Append-only access log feeding KPI 16 (distinct learners who accessed an
 * épreuve/concours) and, since #260, the per-module audience figures.
 * Best-effort: a failed insert is logged and swallowed so it never breaks the
 * read it instruments. utilisateur_id may be null (e.g. unauthenticated
 * access) — the FK is ON DELETE SET NULL anyway.
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
