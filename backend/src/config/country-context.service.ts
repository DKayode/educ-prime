import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { CountryConfigService } from './country-config.service';

interface CountryStore {
    country: string;
}

@Injectable()
export class CountryContextService {
    private readonly als = new AsyncLocalStorage<CountryStore>();

    constructor(private readonly config: CountryConfigService) { }

    run<T>(country: string, callback: () => T): T {
        return this.als.run({ country }, callback);
    }

    /**
     * Runs `callback` once per configured country, with the ALS context set
     * to that country. Use this for cron jobs, BullMQ processors, and any
     * other non-HTTP path that needs to operate across all tenants.
     */
    async runForEachCountry<T>(
        callback: (country: string) => Promise<T>,
    ): Promise<T[]> {
        const results: T[] = [];
        for (const country of this.config.getCountries()) {
            const result = await this.run(country, () => callback(country));
            results.push(result);
        }
        return results;
    }

    getCountry(): string {
        const store = this.als.getStore();
        if (!store) {
            throw new Error(
                'Country context is not set. Make sure CountryMiddleware ran ' +
                'for this request, or wrap non-HTTP code paths with ' +
                'CountryContextService.run() / runForEachCountry().',
            );
        }
        return store.country;
    }

    getCountryOrNull(): string | null {
        return this.als.getStore()?.country ?? null;
    }
}
