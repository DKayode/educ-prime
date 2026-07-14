import { Injectable } from '@nestjs/common';
import { AppConfig, CountryConfigEntry, loadConfig } from './country-config';

export interface CountrySummary {
    country: string;
    logo: string | null;
    timezone: string | null;
    currency: string | null;
}

@Injectable()
export class CountryConfigService {
    private readonly configs: CountryConfigEntry[];
    private readonly app: AppConfig;
    private readonly slugs: Set<string>;

    constructor() {
        const full = loadConfig();
        this.configs = full.country;
        this.app = full.app;
        this.slugs = new Set(this.configs.map(c => c.name));
    }

    getCountries(): string[] {
        return [...this.slugs];
    }

    /**
     * Public-safe shape for the GET /countries response. We expose
     * `country` (the slug) rather than `name` so the frontend contract
     * stays stable, and surface the new metadata (timezone, currency)
     * the mobile + admin clients want for localized formatting.
     */
    listCountries(): CountrySummary[] {
        return this.configs.map(c => ({
            country: c.name,
            logo: c.logo ?? null,
            timezone: c.timezone ?? null,
            currency: c.currency ?? null,
        }));
    }

    hasCountry(country: string): boolean {
        return this.slugs.has(country);
    }

    getAppConfig(): AppConfig {
        return { ...this.app };
    }

    getCountryEntry(country: string): CountryConfigEntry | null {
        return this.configs.find(c => c.name === country) ?? null;
    }

    // Non-canonical IANA names that some CONFIG payloads still carry; neither
    // Node's ICU nor Postgres's tz database recognizes them, so map to the
    // canonical zone (same offset) before any tz-aware computation.
    private static readonly TZ_ALIASES: Record<string, string> = {
        'Africa/Cotonou': 'Africa/Porto-Novo',
    };

    /**
     * The country's IANA timezone, alias-normalized. Returns null when the
     * config carries none — callers pick their own fallback (e.g. 'UTC').
     */
    getTimezone(country: string): string | null {
        const raw = this.getCountryEntry(country)?.timezone ?? null;
        if (!raw) return null;
        return CountryConfigService.TZ_ALIASES[raw] ?? raw;
    }
}
