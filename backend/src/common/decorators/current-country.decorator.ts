import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the country slug attached to the request by CountryMiddleware.
 * Always populated (defaults to 'benin' when neither ?country= nor body.pays
 * is provided) so downstream services can use it as a `pays` filter without
 * nullchecks.
 *
 *   findAll(@CurrentCountry() pays: string) { ... }
 */
export const CurrentCountry = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.country ?? 'benin';
    },
);

/**
 * Like {@link CurrentCountry} but preserves the "no country supplied" signal
 * instead of defaulting to 'benin'. Returns `undefined` when the caller sent
 * no ?country= on a path the CountryMiddleware allows to span all countries
 * (see ALL_COUNTRIES_PATHS). Used by GET /stats so an unfiltered request can
 * aggregate across every configured country.
 *
 *   getStats(@CurrentCountryOptional() pays: string | undefined) { ... }
 */
export const CurrentCountryOptional = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string | undefined => {
        const request = ctx.switchToHttp().getRequest();
        return request.country ?? undefined;
    },
);
