import * as fs from 'fs';
import * as path from 'path';

export interface CountryConfigEntry {
    country: string;
    logo?: string;
    storage?: string;
}

// Resolve from cwd (project root in dev, /app in Docker) rather than __dirname
// which differs between src/ and dist/ layouts.
const CONFIG_PATH = process.env.COUNTRY_CONFIG_PATH
    ?? path.resolve(process.cwd(), 'config', 'config.json');

let cached: CountryConfigEntry[] | null = null;

export function loadCountryConfigs(): CountryConfigEntry[] {
    if (cached !== null) return cached;

    if (!fs.existsSync(CONFIG_PATH)) {
        cached = [];
        return cached;
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`config.json is not valid JSON: ${(err as Error).message}`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error('config.json must be an array of country entries');
    }

    parsed.forEach((entry: any, i: number) => {
        if (!entry?.country || typeof entry.country !== 'string') {
            throw new Error(`config.json entry ${i}: missing or invalid 'country'`);
        }
    });

    cached = parsed as CountryConfigEntry[];
    return cached;
}
