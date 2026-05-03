import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { CountryContextService } from './country-context.service';
import { CountryConfigService } from './country-config.service';

@Injectable()
export class DataSourceResolver implements OnModuleInit {
    private readonly logger = new Logger(DataSourceResolver.name);
    private readonly dataSources = new Map<string, DataSource>();
    private defaultDataSource: DataSource | null = null;

    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly context: CountryContextService,
        private readonly config: CountryConfigService,
    ) { }

    onModuleInit() {
        for (const country of this.config.getCountries()) {
            try {
                const ds = this.moduleRef.get<DataSource>(getDataSourceToken(country) as any, {
                    strict: false,
                });
                if (ds) this.dataSources.set(country, ds);
            } catch (err) {
                this.logger.warn(`Country '${country}' is in config.json but no DataSource was registered: ${(err as Error).message}`);
            }
        }

        try {
            this.defaultDataSource = this.moduleRef.get<DataSource>(getDataSourceToken() as any, {
                strict: false,
            });
        } catch {
            this.defaultDataSource = null;
        }

        this.logger.log(
            `Country DataSources registered: [${Array.from(this.dataSources.keys()).join(', ') || 'none'}]; ` +
            `default fallback: ${this.defaultDataSource ? 'yes' : 'no'}`,
        );
    }

    getDataSource(): DataSource {
        const country = this.context.getCountry();
        const ds = this.dataSources.get(country);
        if (ds) return ds;

        if (this.defaultDataSource) {
            this.logger.warn(
                `No named DataSource for country '${country}'; falling back to default DATABASE_URL connection. ` +
                `Check that backend/config/config.json was injected correctly (COUNTRY_CONFIG secret).`,
            );
            return this.defaultDataSource;
        }

        throw new InternalServerErrorException(
            `No DataSource registered for country '${country}' and no default connection available. ` +
            `Either COUNTRY_CONFIG secret or DATABASE_URL must be set.`,
        );
    }

    getRepository<Entity extends ObjectLiteral>(entity: EntityTarget<Entity>): Repository<Entity> {
        return this.getDataSource().getRepository(entity);
    }
}
