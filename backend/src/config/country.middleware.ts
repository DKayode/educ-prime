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
            country = process.env.COUNTRY_DEFAULT?.toLowerCase() || 'benin';
        }

        if (!this.config.hasCountry(country)) {
            throw new BadRequestException(
                `Unknown country: '${country}'. Configured: ${this.config.getCountries().join(', ')}`,
            );
        }

        // The middleware consumes the param. Removing it from req.query keeps
        // the global ValidationPipe (forbidNonWhitelisted: true) from rejecting
        // every endpoint whose @Query DTO doesn't declare a `country` field.
        (req as any).country = country;
        delete (req.query as any).country;
        this.context.run(country, () => next());
    }
}
