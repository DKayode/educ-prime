import { Global, Module } from '@nestjs/common';
import { CountryConfigService } from './country-config.service';

@Global()
@Module({
    providers: [CountryConfigService],
    exports: [CountryConfigService],
})
export class CountryConfigModule { }
