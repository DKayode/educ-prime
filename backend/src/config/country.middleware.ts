import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CountryContextService } from './country-context.service';
import { CountryConfigService } from './country-config.service';

const ALLOWLIST: RegExp[] = [
    /^\/?$/,
    /^\/health/,
    /^\/docs/,
    /^\/swagger/,
    /^\/api-docs/,
    /^\/api\/docs/,
];

@Injectable()
export class CountryMiddleware implements NestMiddleware {
    constructor(
        private readonly context: CountryContextService,
        private readonly config: CountryConfigService,
    ) { }

    use(req: Request, res: Response, next: NextFunction) {
        if (req.method === 'OPTIONS') return next();
        if (ALLOWLIST.some(pattern => pattern.test(req.path))) return next();

        let country = (req.query.country as string | undefined)?.toLowerCase();

        if (!country) {
            const fallback = process.env.COUNTRY_DEFAULT?.toLowerCase();
            if (fallback) {
                country = fallback;
            } else {
                throw new BadRequestException(
                    'Missing required query parameter: country (e.g. ?country=benin)',
                );
            }
        }

        if (!this.config.hasCountry(country)) {
            throw new BadRequestException(
                `Unknown country: '${country}'. Configured: ${this.config.getCountries().join(', ')}`,
            );
        }

        (req as any).country = country;
        this.context.run(country, () => next());
    }
}
