import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { TypeProfil } from './entities/type-profil.entity';
import { EntityTypeProfil } from './entities/entity-type-profil.entity';
import { TAGGABLE_ENTITIES } from './taggable-entities';
import { CreateTypeProfilDto } from './dto/create-type-profil.dto';
import { UpdateTypeProfilDto } from './dto/update-type-profil.dto';
import { FilterTypeProfilDto } from './dto/filter-type-profil.dto';

@Injectable()
export class TypeProfilsService {
    private readonly logger = new Logger(TypeProfilsService.name);

    constructor(private readonly resolver: DataSourceResolver) { }

    private get typeProfilRepository(): Repository<TypeProfil> {
        return this.resolver.getRepository(TypeProfil);
    }

    private get registryRepository(): Repository<EntityTypeProfil> {
        return this.resolver.getRepository(EntityTypeProfil);
    }

    private tp(t?: TypeProfil | null) {
        return t ? { uuid: t.uuid, id: t.id, titre: t.titre, sous_titre: t.sous_titre ?? null } : null;
    }

    // REGISTRE — quel type de profil est associé à chaque entité (par pays).
    // Renvoie toujours les 5 entités (type_profil = null si non associée = publique).
    async getRegistry(pays: string) {
        const rows = await this.registryRepository.find({ where: { pays }, relations: ['type_profil'] });
        const byEntity = new Map(rows.map((r) => [r.entity, r.type_profil]));
        return TAGGABLE_ENTITIES.map((entity) => ({ entity, type_profil: this.tp(byEntity.get(entity)) }));
    }

    // Associe (ou dissocie si type_profil_id = null) une entité à un type de profil.
    async setAssociation(pays: string, entity: string, typeProfilId: number | null) {
        if (!TAGGABLE_ENTITIES.includes(entity as any)) {
            throw new BadRequestException(`Entité inconnue: '${entity}'. Attendu: ${TAGGABLE_ENTITIES.join(', ')}`);
        }
        const existing = await this.registryRepository.findOne({ where: { entity, pays } });
        if (typeProfilId == null) {
            if (existing) await this.registryRepository.remove(existing);
            return { entity, type_profil: null };
        }
        const typeProfil = await this.typeProfilRepository.findOne({ where: { id: typeProfilId, pays } });
        if (!typeProfil) {
            throw new NotFoundException(`Type de profil ${typeProfilId} non trouvé pour ce pays`);
        }
        if (existing) {
            existing.type_profil_id = typeProfilId;
            await this.registryRepository.save(existing);
        } else {
            await this.registryRepository.save(
                this.registryRepository.create({ entity, type_profil_id: typeProfilId, pays }),
            );
        }
        return { entity, type_profil: this.tp(typeProfil) };
    }

    // pays vient de @CurrentCountry() : PREMIER argument, jamais dans un DTO.
    async create(pays: string, dto: CreateTypeProfilDto): Promise<TypeProfil> {
        this.logger.log(`Création d'un type de profil: ${dto.titre} (pays=${pays})`);
        const typeProfil = this.typeProfilRepository.create({ ...dto, pays });
        return this.typeProfilRepository.save(typeProfil);
    }

    async findAll(pays: string, filterDto: FilterTypeProfilDto): Promise<PaginationResponse<TypeProfil>> {
        const { page = 1, limit = 10, search, sort_order = 'ASC' } = filterDto;
        this.logger.log(`Récupération des types de profil (pays=${pays}) - Page: ${page}, Limit: ${limit}`);

        const queryBuilder = this.typeProfilRepository
            .createQueryBuilder('type_profil')
            .where('type_profil.pays = :pays', { pays });

        if (search) {
            queryBuilder.andWhere(
                '(unaccent(type_profil.titre) ILIKE unaccent(:search) OR unaccent(type_profil.sous_titre) ILIKE unaccent(:search))',
                { search: `%${search}%` },
            );
        }

        queryBuilder
            .orderBy('type_profil.titre', sort_order)
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(pays: string, id: number): Promise<TypeProfil> {
        const typeProfil = await this.typeProfilRepository.findOne({ where: { id, pays } });
        if (!typeProfil) {
            throw new NotFoundException(`Type de profil avec l'ID ${id} non trouvé`);
        }
        return typeProfil;
    }

    async update(pays: string, id: number, dto: UpdateTypeProfilDto): Promise<TypeProfil> {
        const typeProfil = await this.findOne(pays, id);
        Object.assign(typeProfil, dto);
        return this.typeProfilRepository.save(typeProfil);
    }

    async remove(pays: string, id: number): Promise<void> {
        const typeProfil = await this.findOne(pays, id);
        await this.typeProfilRepository.remove(typeProfil);
    }
}
