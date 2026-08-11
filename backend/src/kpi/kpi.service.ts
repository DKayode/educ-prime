import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CountryConfigService } from '../config/country-config.service';

/**
 * KPI dashboard (Mastercard Foundation reporting). Every figure is scoped by
 * country (pays) and by a [startDate, endDate] period. endDate is inclusive of
 * the whole day — the SQL upper bound is exclusive at endDate + 1 day.
 *
 * Day boundaries are interpreted in the COUNTRY's local timezone, not UTC:
 * date_creation / accessed_at are stored as UTC-naive timestamps, so a Benin
 * (UTC+1) signup at 00:30 local lands on the previous UTC day and would be
 * miscounted by a plain `::date` window. We convert the [start, end] date
 * bounds into their UTC instants for the country zone instead. The zone is
 * resolved from config and validated against pg_timezone_names (fallback UTC),
 * so an unknown name can never error the query.
 *
 * Conventions (confirmed in the spec):
 *  - apprenant / learner = role 'étudiant'; female = sexe 'F'.
 *  - age ≤ 35: age_group in the under-35 buckets ('< 18','18 - 25','26 - 35').
 *    NULL age_group is excluded automatically (not counted). Replaces the former
 *    date_naissance-based computation.
 *  - disability: situation_handicap IS TRUE (booléen).
 *  - logins (KPI 8 / 15): distinct login_events.utilisateur_id in the period.
 *    login_events is append-only, one row per successful login (migration 073).
 *    It replaced refresh_tokens, which could not measure this: createRefreshToken
 *    DELETES the device's previous row before inserting a new one, so only the
 *    LAST login of each user survived. A user returning every week appeared only
 *    in the period of their most recent visit, and re-running a report for a past
 *    period returned a different figure each time. Journal starts 2026-08-11:
 *    earlier periods legitimately read 0.
 *  - KPI 16: distinct learners with a resource_access row (épreuve|concours) in
 *    the trailing week / 2 weeks / month windows, all anchored on endDate.
 */
@Injectable()
export class KpiService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly countryConfig: CountryConfigService,
  ) {}

  async getKpis(pays: string, startDate: string, endDate: string) {
    const n = (v: unknown) => Number(v ?? 0);

    // Resolve a guaranteed-valid zone for this country: config value
    // (alias-normalized), then validated against pg_timezone_names so an
    // unknown name silently degrades to UTC instead of erroring the query.
    const [{ zone }] = await this.dataSource.query(
      `SELECT COALESCE((SELECT name FROM pg_timezone_names WHERE name = $1), 'UTC') AS zone`,
      [this.countryConfig.getTimezone(pays)],
    );

    // UTC instants of the country-local [start 00:00 … (end+1) 00:00) window.
    // lo/hi params: $2 startDate, $3 endDate, $4 zone.
    const lo = `($2::date::timestamp AT TIME ZONE $4) AT TIME ZONE 'UTC'`;
    const hi = `(($3::date + interval '1 day')::timestamp AT TIME ZONE $4) AT TIME ZONE 'UTC'`;

    const [demographics] = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                                                  AS total_users,
        COUNT(*) FILTER (WHERE age_group IN ('< 18','18 - 25','26 - 35'))           AS users_age_35,
        COUNT(*) FILTER (WHERE sexe = 'F')                                                         AS female_users,
        COUNT(*) FILTER (WHERE sexe = 'F' AND age_group IN ('< 18','18 - 25','26 - 35')) AS female_age_35,
        COUNT(*) FILTER (WHERE zone_residence = 'rural')                                           AS rural_users,
        COUNT(*) FILTER (WHERE situation_handicap IS TRUE)   AS disability_users,
        COUNT(*) FILTER (WHERE role = 'étudiant')                                                  AS learners,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND age_group IN ('< 18','18 - 25','26 - 35')) AS learners_age_35,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND sexe = 'F' AND age_group IN ('< 18','18 - 25','26 - 35')) AS learners_age_35_female,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND sexe = 'F')                                   AS female_learners,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND zone_residence = 'rural')                     AS rural_learners,
        COUNT(*) FILTER (WHERE role = 'étudiant' AND situation_handicap IS TRUE) AS disability_learners
      FROM utilisateurs
      WHERE pays = $1
        AND date_creation >= ${lo}
        AND date_creation < ${hi}
      `,
      [pays, startDate, endDate, zone],
    );

    const [logins] = await this.dataSource.query(
      `
      SELECT
        COUNT(DISTINCT rt.utilisateur_id)                                       AS users_logged_in,
        COUNT(DISTINCT rt.utilisateur_id) FILTER (WHERE u.role = 'étudiant')    AS learners_logged_in
      FROM login_events rt
      JOIN utilisateurs u ON u.id = rt.utilisateur_id
      WHERE u.pays = $1
        AND rt.date_creation >= ${lo}
        AND rt.date_creation < ${hi}
      `,
      [pays, startDate, endDate, zone],
    );

    // KPI 16 windows are anchored on the country-local end-of-endDate instant.
    const endUtc = `(($2::date + interval '1 day')::timestamp AT TIME ZONE $3) AT TIME ZONE 'UTC'`;
    const [access] = await this.dataSource.query(
      `
      SELECT
        COUNT(DISTINCT ra.utilisateur_id) FILTER (WHERE ra.accessed_at >= (${endUtc} - interval '7 days'))  AS last_week,
        COUNT(DISTINCT ra.utilisateur_id) FILTER (WHERE ra.accessed_at >= (${endUtc} - interval '14 days')) AS last_two_weeks,
        COUNT(DISTINCT ra.utilisateur_id) FILTER (WHERE ra.accessed_at >= (${endUtc} - interval '1 month')) AS last_month
      FROM resource_access ra
      JOIN utilisateurs u ON u.id = ra.utilisateur_id AND u.role = 'étudiant'
      WHERE ra.pays = $1
        AND ra.resource_type IN ('epreuve', 'concours')
        AND ra.accessed_at < ${endUtc}
      `,
      [pays, endDate, zone],
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
