import { Global, Module } from '@nestjs/common';
import { CountryConfigService } from './country-config.service';
import { CountryContextService } from './country-context.service';
import { DataSourceResolver } from './data-source-resolver.service';
import { CountriesController } from './countries.controller';

@Global()
@Module({
    controllers: [CountriesController],
    providers: [CountryConfigService, CountryContextService, DataSourceResolver],
    exports: [CountryConfigService, CountryContextService, DataSourceResolver],
})
export class CountryConfigModule { }
