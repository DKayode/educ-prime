import { Global, Module } from '@nestjs/common';
import { CountryConfigService } from './country-config.service';
import { CountryContextService } from './country-context.service';
import { DataSourceResolver } from './data-source-resolver.service';
import { CountriesController } from './countries.controller';
import { AppConfigController } from './app.controller';

@Global()
@Module({
    controllers: [CountriesController, AppConfigController],
    providers: [CountryConfigService, CountryContextService, DataSourceResolver],
    exports: [CountryConfigService, CountryContextService, DataSourceResolver],
})
export class CountryConfigModule { }
