import { Injectable, NotFoundException } from '@nestjs/common';
import { CountryConfigEntry, loadCountryConfigs } from './country-config';

@Injectable()
export class CountryConfigService {
    private readonly configs: CountryConfigEntry[];
    private readonly byCountry: Map<string, CountryConfigEntry>;

    constructor() {
        this.configs = loadCountryConfigs();
        this.byCountry = new Map(this.configs.map(c => [c.country, c]));
    }

    getCountries(): string[] {
        return this.configs.map(c => c.country);
    }

    hasCountry(country: string): boolean {
        return this.byCountry.has(country);
    }

    getDatabaseUrl(country: string): string {
        return this.requireEntry(country).config.database;
    }

    getStorageUrl(country: string): string {
        return this.requireEntry(country).config.storage;
    }

    private requireEntry(country: string): CountryConfigEntry {
        const entry = this.byCountry.get(country);
        if (!entry) {
            throw new NotFoundException(`Country '${country}' is not configured`);
        }
        return entry;
    }
}
