import { Injectable } from '@nestjs/common';
import { CountryConfigEntry, loadCountryConfigs } from './country-config';

export interface CountrySummary {
    country: string;
    logo: string | null;
}

@Injectable()
export class CountryConfigService {
    private readonly configs: CountryConfigEntry[];
    private readonly slugs: Set<string>;

    constructor() {
        this.configs = loadCountryConfigs();
        this.slugs = new Set(this.configs.map(c => c.country));
    }

    getCountries(): string[] {
        return [...this.slugs];
    }

    listCountries(): CountrySummary[] {
        return this.configs.map(c => ({
            country: c.country,
            logo: c.logo ?? null,
        }));
    }

    hasCountry(country: string): boolean {
        return this.slugs.has(country);
    }
}
