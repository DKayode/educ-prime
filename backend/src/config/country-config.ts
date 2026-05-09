import * as fs from 'fs';
import * as path from 'path';

/**
 * Per-country entry in config.json's `country[]` array.
 *
 * `name` is the slug accepted as `?country=` and stored as `pays` (e.g.
 * `benin`, `senegal`). The pre-pivot config used a `country` field for
 * this; we accept both during transition (loader normalizes to `name`).
 */
export interface CountryConfigEntry {
    name: string;
    logo?: string;
    timezone?: string;
    currency?: string;
}

/** App-level branding read by the /app endpoint and the mail service. */
export interface AppConfig {
    name: string;
    logo: string;
    favicon: string;
}

export interface FullConfig {
    country: CountryConfigEntry[];
    app: AppConfig;
}

// Resolve from cwd (project root in dev, /app in Docker) rather than __dirname
// which differs between src/ and dist/ layouts.
const CONFIG_PATH = process.env.COUNTRY_CONFIG_PATH
    ?? path.resolve(process.cwd(), 'config', 'config.json');

let cached: FullConfig | null = null;

function asArray(v: unknown): unknown[] | null {
    return Array.isArray(v) ? v : null;
}

export function loadConfig(): FullConfig {
    if (cached !== null) return cached;

    if (!fs.existsSync(CONFIG_PATH)) {
        cached = { country: [], app: { name: 'Edukia', logo: '', favicon: '' } };
        return cached;
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`config.json is not valid JSON: ${(err as Error).message}`);
    }

    // Country list — accept the new `country[]` shape OR a bare top-level
    // array (legacy) so we don't break boots during the transition.
    const countryList = asArray(parsed?.country) ?? asArray(parsed) ?? [];
    const countries: CountryConfigEntry[] = countryList.map((entry: any, i: number) => {
        const name = entry?.name ?? entry?.country;
        if (!name || typeof name !== 'string') {
            throw new Error(`config.json country[${i}]: missing 'name'`);
        }
        // Tolerate the `cuurency` typo present in early configs; log so it
        // gets fixed at the source.
        let currency: string | undefined = entry?.currency;
        if (!currency && typeof entry?.cuurency === 'string') {
            console.warn(
                `[country-config] '${name}' uses the legacy 'cuurency' spelling. ` +
                `Rename to 'currency' in config.json (and the COUNTRY_CONFIG secret).`,
            );
            currency = entry.cuurency;
        }
        return {
            name,
            logo: typeof entry?.logo === 'string' ? entry.logo : undefined,
            timezone: typeof entry?.timezone === 'string' ? entry.timezone : undefined,
            currency,
        };
    });

    // App branding — defaults preserve previous behavior if the section is
    // missing entirely.
    const app: AppConfig = {
        name: typeof parsed?.app?.name === 'string' ? parsed.app.name : 'Edukia',
        logo: typeof parsed?.app?.logo === 'string' ? parsed.app.logo : '',
        favicon: typeof parsed?.app?.favicon === 'string' ? parsed.app.favicon : '',
    };

    cached = { country: countries, app };
    return cached;
}

/** Backward-compat alias used by some callers. */
export function loadCountryConfigs(): CountryConfigEntry[] {
    return loadConfig().country;
}
