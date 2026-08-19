import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Statistiques des demandes d'approbation de ressources : soumissions
 * d'épreuves, de concours et d'examens nationaux. Scopé par pays et par une
 * période [startDate, endDate] optionnelle (endDate incluse — la borne SQL est
 * exclusive à endDate + 1 jour).
 *
 * Les examens nationaux manquaient : ce service est né avant qu'ils ne
 * deviennent une ressource à part entière, et leurs soumissions — dont la file
 * d'attente — restaient invisibles sur la page Approbations.
 *
 * Les tables de soumissions n'ont pas d'entité TypeORM sur cette branche :
 * on les lit en SQL brut via le DataSource injecté. « à compléter » = une
 * soumission en attente dont un parent proposé (texte libre) est renseigné,
 * donc que l'admin doit rattacher à une entité existante avant d'approuver.
 */
@Injectable()
export class SubmissionsStatsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getStats(pays: string, startDate?: string, endDate?: string) {
    const params = [pays, startDate ?? null, endDate ?? null];

    // Fenêtre commune : COALESCE gère l'absence de bornes (défaut 1970 → aujourd'hui).
    const periodFilter = `
      pays = $1
      AND date_creation >= COALESCE($2::date, '1970-01-01'::date)
      AND date_creation < (COALESCE($3::date, CURRENT_DATE) + interval '1 day')
    `;

    const [epreuves] = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                                   AS total,
        COUNT(*) FILTER (WHERE status = 'pending_approval')                        AS pending_approval,
        COUNT(*) FILTER (WHERE status = 'approved')                                AS approved,
        COUNT(*) FILTER (WHERE status = 'declined')                                AS declined,
        COUNT(*) FILTER (WHERE status = 'pending_approval' AND (
          NULLIF(proposed_etablissement, '') IS NOT NULL OR
          NULLIF(proposed_filiere, '')       IS NOT NULL OR
          NULLIF(proposed_niveau, '')        IS NOT NULL OR
          NULLIF(proposed_matiere, '')       IS NOT NULL
        ))                                                                          AS a_completer
      FROM epreuve_submissions
      WHERE ${periodFilter}
      `,
      params,
    );

    const [concours] = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                                   AS total,
        COUNT(*) FILTER (WHERE status = 'pending_approval')                        AS pending_approval,
        COUNT(*) FILTER (WHERE status = 'approved')                                AS approved,
        COUNT(*) FILTER (WHERE status = 'declined')                                AS declined,
        COUNT(*) FILTER (WHERE status = 'pending_approval' AND (
          NULLIF(proposed_structure, '') IS NOT NULL OR
          NULLIF(proposed_titre, '')     IS NOT NULL
        ))                                                                          AS a_completer
      FROM concours_submissions
      WHERE ${periodFilter}
      `,
      params,
    );

    const [examensNationaux] = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                                   AS total,
        COUNT(*) FILTER (WHERE status = 'pending_approval')                        AS pending_approval,
        COUNT(*) FILTER (WHERE status = 'approved')                                AS approved,
        COUNT(*) FILTER (WHERE status = 'declined')                                AS declined,
        COUNT(*) FILTER (WHERE status = 'pending_approval' AND (
          NULLIF(proposed_type, '')    IS NOT NULL OR
          NULLIF(proposed_serie, '')   IS NOT NULL OR
          NULLIF(proposed_matiere, '') IS NOT NULL OR
          NULLIF(proposed_filiere, '') IS NOT NULL
        ))                                                                          AS a_completer
      FROM examens_nationaux_submissions
      WHERE ${periodFilter}
      `,
      params,
    );

    // Série temporelle pour le graphe. La granularité s'adapte à l'étendue pour
    // rester compacte : jour (≤ 62 j), semaine (≤ 2 ans), sinon mois. Sans borne
    // basse explicite, on démarre à la 1re soumission (pas 1970) pour ne pas
    // émettre des décennies de zéros. Un bucket par période, jointure LEFT pour
    // garder les périodes vides à 0.
    const rows = await this.dataSource.query(
      `
      WITH bounds AS (
        SELECT
          COALESCE($2::date, LEAST(
            (SELECT MIN(date_creation)::date FROM epreuve_submissions            WHERE pays = $1),
            (SELECT MIN(date_creation)::date FROM concours_submissions           WHERE pays = $1),
            (SELECT MIN(date_creation)::date FROM examens_nationaux_submissions  WHERE pays = $1)
          ), CURRENT_DATE)      AS lo,
          COALESCE($3::date, CURRENT_DATE) AS hi
      ),
      grain AS (
        SELECT lo, hi,
          CASE WHEN hi - lo <= 62  THEN 'day'
               WHEN hi - lo <= 730 THEN 'week'
               ELSE 'month' END                                        AS g,
          CASE WHEN hi - lo <= 62  THEN interval '1 day'
               WHEN hi - lo <= 730 THEN interval '1 week'
               ELSE interval '1 month' END                             AS step
        FROM bounds
      ),
      buckets AS (
        SELECT generate_series(date_trunc(g, lo::timestamp), date_trunc(g, hi::timestamp), step) AS bucket
        FROM grain
      ),
      e AS (
        SELECT date_trunc((SELECT g FROM grain), date_creation) AS bucket, COUNT(*) AS cnt
        FROM epreuve_submissions WHERE ${periodFilter} GROUP BY 1
      ),
      c AS (
        SELECT date_trunc((SELECT g FROM grain), date_creation) AS bucket, COUNT(*) AS cnt
        FROM concours_submissions WHERE ${periodFilter} GROUP BY 1
      ),
      x AS (
        SELECT date_trunc((SELECT g FROM grain), date_creation) AS bucket, COUNT(*) AS cnt
        FROM examens_nationaux_submissions WHERE ${periodFilter} GROUP BY 1
      )
      SELECT
        to_char(b.bucket, 'YYYY-MM-DD') AS date,
        (SELECT g FROM grain)           AS granularity,
        COALESCE(e.cnt, 0)::int         AS epreuves,
        COALESCE(c.cnt, 0)::int         AS concours,
        COALESCE(x.cnt, 0)::int         AS examens_nationaux
      FROM buckets b
      LEFT JOIN e ON e.bucket = b.bucket
      LEFT JOIN c ON c.bucket = b.bucket
      LEFT JOIN x ON x.bucket = b.bucket
      ORDER BY b.bucket
      `,
      params,
    );

    const granularity = rows[0]?.granularity ?? 'day';
    const series = rows.map((r: any) => ({
      date: r.date,
      epreuves: r.epreuves,
      concours: r.concours,
      examens_nationaux: r.examens_nationaux,
    }));

    const shape = (row: any) => {
      const approved = Number(row.approved ?? 0);
      const declined = Number(row.declined ?? 0);
      const reviewed = approved + declined;
      return {
        total: Number(row.total ?? 0),
        pending_approval: Number(row.pending_approval ?? 0),
        approved,
        declined,
        a_completer: Number(row.a_completer ?? 0),
        // approuvés / (approuvés + refusés) ; 0 quand rien n'a encore été traité.
        approval_rate: reviewed === 0 ? 0 : approved / reviewed,
      };
    };

    const e = shape(epreuves);
    const c = shape(concours);
    const x = shape(examensNationaux);
    const combinedReviewed =
      e.approved + e.declined + c.approved + c.declined + x.approved + x.declined;
    const combined = {
      total: e.total + c.total + x.total,
      pending_approval: e.pending_approval + c.pending_approval + x.pending_approval,
      approved: e.approved + c.approved + x.approved,
      declined: e.declined + c.declined + x.declined,
      a_completer: e.a_completer + c.a_completer + x.a_completer,
      approval_rate:
        combinedReviewed === 0 ? 0 : (e.approved + c.approved + x.approved) / combinedReviewed,
    };

    return {
      pays,
      periode: { startDate: startDate ?? null, endDate: endDate ?? null },
      epreuves: e,
      concours: c,
      examens_nationaux: x,
      combined,
      granularity,
      series,
    };
  }
}
