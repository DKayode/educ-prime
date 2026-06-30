import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * KPI dashboard (Mastercard Foundation reporting). Every figure is scoped by
 * country (pays) and by a [startDate, endDate] period. endDate is inclusive of
 * the whole day — the SQL upper bound is exclusive at endDate + 1 day.
 *
 * Conventions (confirmed in the spec):
 *  - apprenant / learner = role 'étudiant'; female = sexe 'F'.
 *  - age ≤ 35 at registration: born on/after date_creation − 35 years, i.e.
 *    date_naissance >= date_creation − interval '35 years'. NULL birthdates are
 *    excluded automatically (the comparison is NULL → not counted).
 *  - disability: situation_handicap IS NOT NULL AND <> 'aucun'.
 *  - logins (KPI 8 / 15): distinct refresh_tokens.utilisateur_id in the period
 *    (refresh_tokens has no pays, so we join utilisateurs for the country scope).
 *  - KPI 16: distinct learners with a resource_access row (épreuve|concours) in
 *    the trailing week / 2 weeks / month windows, all anchored on endDate.
 */
@Injectable()
export class KpiService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getKpis(pays: string, startDate: string, endDate: string) {
    const n = (v: unknown) => Number(v ?? 0);

    const [demographics] = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                                                  AS total_users,
        COUNT(*) FILTER (WHERE date_naissance >= (date_creation - interval '35 years'))           AS users_age_35,
        COUNT(*) FILTER (WHERE sexe = 'F')                                                         AS female_users,
        COUNT(*) FILTER (WHERE sexe = 'F' AND date_naissance >= (date_creation - interval '35 years')) AS female_age_35,
        COUNT(*) FILTER (WHERE zone_residence = 'rural')                                           AS rural_users,
        COUNT(*) FILTER (WHERE situation_handicap IS NOT NULL AND situation_handicap <> 'aucun')   AS disability_users,
        COUNT(*) FILTER (WHERE role = 'étudiant')                                                  AS learners,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND date_naissance >= (date_creation - interval '35 years')) AS learners_age_35,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND sexe = 'F' AND date_naissance >= (date_creation - interval '35 years')) AS learners_age_35_female,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND sexe = 'F')                                   AS female_learners,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND zone_residence = 'rural')                     AS rural_learners,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND situation_handicap IS NOT NULL AND situation_handicap <> 'aucun') AS disability_learners
      FROM utilisateurs
      WHERE pays = $1
        AND date_creation >= $2::date
        AND date_creation < ($3::date + interval '1 day')
      `,
      [pays, startDate, endDate],
    );

    const [logins] = await this.dataSource.query(
      `
      SELECT
        COUNT(DISTINCT rt.utilisateur_id)                                       AS users_logged_in,
        COUNT(DISTINCT rt.utilisateur_id) FILTER (WHERE u.role = 'étudiant')    AS learners_logged_in
      FROM refresh_tokens rt
      JOIN utilisateurs u ON u.id = rt.utilisateur_id
      WHERE u.pays = $1
        AND rt.date_creation >= $2::date
        AND rt.date_creation < ($3::date + interval '1 day')
      `,
      [pays, startDate, endDate],
    );

    const [access] = await this.dataSource.query(
      `
      SELECT
        COUNT(DISTINCT ra.utilisateur_id) FILTER (WHERE ra.accessed_at >= (($2::date + interval '1 day') - interval '7 days'))  AS last_week,
        COUNT(DISTINCT ra.utilisateur_id) FILTER (WHERE ra.accessed_at >= (($2::date + interval '1 day') - interval '14 days')) AS last_two_weeks,
        COUNT(DISTINCT ra.utilisateur_id) FILTER (WHERE ra.accessed_at >= (($2::date + interval '1 day') - interval '1 month')) AS last_month
      FROM resource_access ra
      JOIN utilisateurs u ON u.id = ra.utilisateur_id AND u.role = 'étudiant'
      WHERE ra.pays = $1
        AND ra.resource_type IN ('epreuve', 'concours')
        AND ra.accessed_at < ($2::date + interval '1 day')
      `,
      [pays, endDate],
    );

    return {
      pays,
      periode: { startDate, endDate },
      // Section 2 — Utilisateurs (over the period, by date_creation)
      utilisateurs: {
        total: n(demographics.total_users),               // KPI 2
        age_35_max: n(demographics.users_age_35),          // KPI 3
        femmes: n(demographics.female_users),              // KPI 4
        femmes_35_max: n(demographics.female_age_35),      // KPI 5
        zone_rurale: n(demographics.rural_users),          // KPI 6
        situation_handicap: n(demographics.disability_users), // KPI 7
        connectes: n(logins.users_logged_in),              // KPI 8
      },
      // Section 3 — Apprenants / Inscription (role 'étudiant')
      apprenants: {
        total: n(demographics.learners),                   // KPI 9
        age_35_max: n(demographics.learners_age_35),       // KPI 10
        age_35_max_femmes: n(demographics.learners_age_35_female), // KPI 11
        femmes: n(demographics.female_learners),           // KPI 12
        zone_rurale: n(demographics.rural_learners),       // KPI 13
        situation_handicap: n(demographics.disability_learners),  // KPI 14
      },
      // Section 4 — Engagement
      engagement: {
        apprenants_connectes: n(logins.learners_logged_in), // KPI 15
        apprenants_ressource: {                             // KPI 16
          semaine: n(access.last_week),
          deux_semaines: n(access.last_two_weeks),
          mois: n(access.last_month),
        },
      },
    };
  }
}
