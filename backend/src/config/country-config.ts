import * as fs from 'fs';
import * as path from 'path';

export interface CountryConfigEntry {
    country: string;
    config: {
        database: string;
        storage: string;
    };
}

const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'config', 'config.json');

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
        if (!entry.config?.database || typeof entry.config.database !== 'string') {
            throw new Error(`config.json entry ${i} (${entry.country}): missing 'config.database'`);
        }
        if (entry.config.storage === undefined || typeof entry.config.storage !== 'string') {
            throw new Error(`config.json entry ${i} (${entry.country}): missing 'config.storage' (use empty string if not yet set)`);
        }
    });

    cached = parsed as CountryConfigEntry[];
    return cached;
}
