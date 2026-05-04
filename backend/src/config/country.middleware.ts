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
];

const DEFAULT_COUNTRY = 'benin';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

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

        const country = provided && provided !== '' ? provided : DEFAULT_COUNTRY;
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
        this.context.run(country, () => next());
    }
}
