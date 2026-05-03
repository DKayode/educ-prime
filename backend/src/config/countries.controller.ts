import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CountryConfigService } from './country-config.service';

@ApiTags('countries')
@Controller('countries')
export class CountriesController {
    constructor(private readonly config: CountryConfigService) { }

    @Get()
    @ApiOperation({ summary: 'List the country slugs the backend is configured for' })
    @ApiResponse({
        status: 200,
        description: 'Array of country slugs that can be passed as ?country= on subsequent requests.',
        schema: {
            type: 'object',
            properties: {
                countries: { type: 'array', items: { type: 'string' }, example: ['benin', 'senegal', 'congo'] },
            },
        },
    })
    list(): { countries: string[] } {
        return { countries: this.config.getCountries() };
    }
}
