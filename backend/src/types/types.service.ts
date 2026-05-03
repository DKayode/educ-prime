import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Not, Repository } from 'typeorm';
import { Type } from './entities/type.entity';
import { Service } from '../services/entities/service.entity';
import { EntiteType } from '../common/enums/entite-type.enum';
import { CreateTypeDto, UpdateTypeDto } from './dto/type.dto';
import { DataSourceResolver } from '../config/data-source-resolver.service';

const slugify = (input: string) =>
    input.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

@Injectable()
export class TypesService {
    constructor(
        private readonly resolver: DataSourceResolver,
    ) { }

    private get typesRepository(): Repository<Type> {
        return this.resolver.getRepository(Type);
    }

    private get servicesRepository(): Repository<Service> {
        return this.resolver.getRepository(Service);
    }

    async create(createTypeDto: CreateTypeDto) {
        const slug = slugify(createTypeDto.nom);

        const existing = await this.typesRepository.findOne({ where: { slug } });
        if (existing) {
            throw new ConflictException('Un type avec ce nom existe déjà.');
        }

        const type = this.typesRepository.create({ ...createTypeDto, slug });
        return this.typesRepository.save(type);
    }

    async findAll(options: { entite_type?: EntiteType, page?: number, limit?: number } = {}) {
        const { entite_type, page = 1, limit = 10 } = options;
        const where = entite_type ? { entite_type } : {};

        const [data, total] = await this.typesRepository.findAndCount({
            where,
            skip: (page - 1) * limit,
            take: limit,
            order: { nom: 'ASC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const type = await this.typesRepository.findOne({ where: { id } });
        if (!type) {
            throw new NotFoundException(`Type #${id} introuvable`);
        }
        return type;
    }

    async update(id: number, updateTypeDto: UpdateTypeDto) {
        const type = await this.findOne(id);

        if (updateTypeDto.nom) {
            const slug = slugify(updateTypeDto.nom);
            const existing = await this.typesRepository.findOne({ where: { slug, id: Not(id) } });
            if (existing) {
                throw new ConflictException('Ce nom est déjà utilisé par un autre type.');
            }
            type.slug = slug;
        }

        Object.assign(type, updateTypeDto);
        return this.typesRepository.save(type);
    }

    async remove(id: number) {
        const type = await this.findOne(id);

        const relatedServicesCount = await this.servicesRepository.count({ where: { type_id: id } });
        if (relatedServicesCount > 0) {
            throw new ForbiddenException(`Impossible de supprimer ce type car il est actuellement assigné à ${relatedServicesCount} service(s).`);
        }

        await this.typesRepository.remove(type);
        return { message: 'Type supprimé avec succès.' };
    }
}
