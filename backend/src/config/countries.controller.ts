import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CountryConfigService } from './country-config.service';

@ApiTags('countries')
@Controller('countries')
export class CountriesController {
    constructor(private readonly config: CountryConfigService) { }

    @Get()
    @ApiOperation({ summary: 'List supported countries with their logo URL' })
    @ApiResponse({
        status: 200,
        description:
            'Array of `{ country, logo }` entries. `country` is the slug accepted as `?country=` and stored as `pays`; `logo` is a public R2 URL or null.',
        schema: {
            type: 'object',
            properties: {
                countries: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            country: { type: 'string', example: 'benin' },
                            logo: {
                                type: 'string',
                                nullable: true,
                                example:
                                    'https://pub-2e98807e7d174d3c9782f5ba328049cf.r2.dev/pays/benin.svg',
                            },
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
