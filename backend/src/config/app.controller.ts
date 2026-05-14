import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CountryConfigService } from './country-config.service';

@ApiTags('app')
@Controller('app')
export class AppConfigController {
    constructor(private readonly config: CountryConfigService) { }

    @Get()
    @ApiOperation({
        summary: 'App branding (name, logo, favicon)',
        description:
            'Returns the app metadata read from config.json `app` section. Frontend ' +
            'and mobile fetch this once at startup to render brand-aware UI without ' +
            'hardcoding asset URLs in the bundle.',
    })
    @ApiResponse({
        status: 200,
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Edukia' },
                logo: { type: 'string', example: 'https://assets.edukia.net/app/logo.png' },
                favicon: { type: 'string', example: 'https://assets.edukia.net/app/favicon.png' },
            },
        },
    })
    get() {
        return this.config.getAppConfig();
    }
}
