import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface CountryStore {
    country: string;
}

@Injectable()
export class CountryContextService {
    private readonly als = new AsyncLocalStorage<CountryStore>();

    run<T>(country: string, callback: () => T): T {
        return this.als.run({ country }, callback);
    }

    getCountry(): string {
        const store = this.als.getStore();
        if (!store) {
            throw new Error(
                'Country context is not set. Make sure CountryMiddleware ran for this request.',
            );
        }
        return store.country;
    }

    getCountryOrNull(): string | null {
        return this.als.getStore()?.country ?? null;
    }
}
