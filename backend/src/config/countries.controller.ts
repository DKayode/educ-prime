import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CountryConfigService } from './country-config.service';

@ApiTags('countries')
@Controller('countries')
export class CountriesController {
    constructor(private readonly config: CountryConfigService) { }

    @Get()
    @ApiOperation({ summary: 'List supported countries with branding + locale metadata' })
    @ApiResponse({
        status: 200,
        description:
            'Array of `{ country, logo, timezone, currency }` entries. `country` is the ' +
            'slug accepted as `?country=` and stored as `pays`. The other fields drive ' +
            'localized formatting (date / money) on clients.',
        schema: {
            type: 'object',
            properties: {
                countries: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            country: { type: 'string', example: 'benin' },
                            logo: { type: 'string', nullable: true, example: 'https://assets.edukia.net/pays/benin.svg' },
                            timezone: { type: 'string', nullable: true, example: 'Africa/Cotonou' },
                            currency: { type: 'string', nullable: true, example: 'XOF' },
                        },
                    },
                },
            },
        },
    })
    list() {
        return { countries: this.config.listCountries() };
    }
}
