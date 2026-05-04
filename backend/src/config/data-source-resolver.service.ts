import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

/**
 * Pre-pivot this resolver fanned out to a per-country DataSource. Now that
 * we're on a single DB scoped via the `pays` column, it just delegates to
 * the default DataSource. Kept as an indirection so the (many) services
 * that still call `this.resolver.getRepository(X)` don't all need to be
 * rewritten to use `@InjectRepository(X)` directly.
 */
@Injectable()
export class DataSourceResolver implements OnModuleInit {
    private defaultDataSource: DataSource | null = null;

    constructor(private readonly moduleRef: ModuleRef) { }

    onModuleInit() {
        try {
            this.defaultDataSource = this.moduleRef.get<DataSource>(getDataSourceToken() as any, {
                strict: false,
            });
        } catch {
            this.defaultDataSource = null;
        }
    }

    getDataSource(): DataSource {
        if (this.defaultDataSource) return this.defaultDataSource;
        throw new InternalServerErrorException(
            'No DataSource registered — DATABASE_URL must be set.',
        );
    }

    getRepository<Entity extends ObjectLiteral>(entity: EntityTarget<Entity>): Repository<Entity> {
        return this.getDataSource().getRepository(entity);
    }
}
