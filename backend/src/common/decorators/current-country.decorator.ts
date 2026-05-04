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
