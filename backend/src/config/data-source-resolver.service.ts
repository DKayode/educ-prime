import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { CountryContextService } from './country-context.service';
import { CountryConfigService } from './country-config.service';

@Injectable()
export class DataSourceResolver implements OnModuleInit {
    private readonly dataSources = new Map<string, DataSource>();

    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly context: CountryContextService,
        private readonly config: CountryConfigService,
    ) { }

    onModuleInit() {
        for (const country of this.config.getCountries()) {
            const ds = this.moduleRef.get<DataSource>(getDataSourceToken(country) as any, {
                strict: false,
            });
            this.dataSources.set(country, ds);
        }
    }

    getDataSource(): DataSource {
        const country = this.context.getCountry();
        const ds = this.dataSources.get(country);
        if (!ds) {
            throw new InternalServerErrorException(`No DataSource registered for country '${country}'`);
        }
        return ds;
    }

    getRepository<Entity extends ObjectLiteral>(entity: EntityTarget<Entity>): Repository<Entity> {
        return this.getDataSource().getRepository(entity);
    }
}
