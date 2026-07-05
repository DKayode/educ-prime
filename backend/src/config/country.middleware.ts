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
    /^\/countries\/?$/,
    /^\/app\/?$/,
];

const DEFAULT_COUNTRY = 'benin';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

// Paths that opt OUT of the 'benin' default: when no country is supplied we
// leave req.country undefined so the handler can aggregate across ALL
// countries. `?country=<slug>` on these paths still scopes as usual.
const ALL_COUNTRIES_PATHS: RegExp[] = [/^\/stats\/?$/];

@Injectable()
export class CountryMiddleware implements NestMiddleware {
    constructor(
        private readonly context: CountryContextService,
        private readonly config: CountryConfigService,
    ) { }

    use(req: Request, res: Response, next: NextFunction) {
        if (req.method === 'OPTIONS') return next();
        if (ALLOWLIST.some(pattern => pattern.test(req.path))) return next();

        // Reads use ?country=, writes use body.pays. Either side serves as a
        // fallback (e.g. multipart POSTs whose body isn't parsed yet still
        // come through via ?country=).
        const isWrite = WRITE_METHODS.has(req.method);
        const fromBody = isWrite && req.body && typeof req.body === 'object' && !Array.isArray(req.body)
            ? (req.body as any).pays
            : undefined;
        const fromQuery = req.query.country as string | undefined;
        const raw = (fromBody ?? fromQuery) as string | undefined;
        const provided = raw?.toLowerCase();

        if (provided !== undefined && provided !== '' && !this.config.hasCountry(provided)) {
            throw new BadRequestException(
                `Unknown country: '${provided}'. Configured: ${this.config.getCountries().join(', ')}`,
            );
        }

        const hasProvided = provided !== undefined && provided !== '';
        const allowsAll = ALL_COUNTRIES_PATHS.some(pattern => pattern.test(req.path));

        // On "all countries" paths, an absent country stays undefined (=> ALL).
        // Everywhere else, keep the historic 'benin' default so no other
        // endpoint's scoping changes.
        const country = hasProvided
            ? provided
            : allowsAll
                ? undefined
                : DEFAULT_COUNTRY;
        (req as any).country = country;

        // Strip from both sides so the global ValidationPipe (whitelist +
        // forbidNonWhitelisted) doesn't reject endpoints whose Query/Body DTOs
        // don't declare a country/pays field.
        delete (req.query as any).country;
        if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
            delete (req.body as any).pays;
        }

        // Run the rest of the request inside the ALS context so cron / queue
        // code paths that read CountryContextService get the right slug too.
        // ALS always needs a concrete slug; the "all countries" signal travels
        // via req.country (undefined) which the /stats handler reads directly.
        this.context.run(country ?? DEFAULT_COUNTRY, () => next());
    }
}
