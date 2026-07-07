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

    // REGISTRE — les types de profil associés à chaque entité (par pays). Une entité
    // peut en avoir PLUSIEURS. Renvoie toujours les 5 entités (liste vide = publique).
    async getRegistry(pays: string) {
        const rows = await this.registryRepository.find({ where: { pays }, relations: ['type_profil'] });
        const byEntity = new Map<string, any[]>();
        for (const r of rows) {
            if (!byEntity.has(r.entity)) byEntity.set(r.entity, []);
            byEntity.get(r.entity)!.push(this.tp(r.type_profil));
        }
        return TAGGABLE_ENTITIES.map((entity) => ({ entity, type_profils: byEntity.get(entity) ?? [] }));
    }

    // Remplace INTÉGRALEMENT la liste des types de profil d'une entité (replace-set).
    // [] = dissocier (l'entité redevient publique). Valide que chaque type existe.
    async setAssociations(pays: string, entity: string, typeProfilIds: number[]) {
        if (!TAGGABLE_ENTITIES.includes(entity as any)) {
            throw new BadRequestException(`Entité inconnue: '${entity}'. Attendu: ${TAGGABLE_ENTITIES.join(', ')}`);
        }
        const unique = Array.from(
            new Set((typeProfilIds ?? []).map((n) => Number(n)).filter((n) => Number.isInteger(n))),
        );
        if (unique.length) {
            const existing = await this.typeProfilRepository.find({ where: unique.map((id) => ({ id, pays })) });
            const existingIds = new Set(existing.map((t) => t.id));
            const missing = unique.filter((id) => !existingIds.has(id));
            if (missing.length) {
                throw new NotFoundException(`Type(s) de profil introuvable(s) pour ce pays: ${missing.join(', ')}`);
            }
        }
        await this.resolver.getDataSource().transaction(async (em) => {
            await em.delete(EntityTypeProfil, { entity, pays });
            for (const tpId of unique) {
                await em.save(em.create(EntityTypeProfil, { entity, type_profil_id: tpId, pays }));
            }
        });
        const rows = await this.registryRepository.find({ where: { entity, pays }, relations: ['type_profil'] });
        return { entity, type_profils: rows.map((r) => this.tp(r.type_profil)) };
    }

    // Inverse du registre : entités associées à un type de profil (par uuid).
    async getEntitiesForTypeProfil(pays: string, uuid: string): Promise<string[]> {
        const typeProfil = await this.typeProfilRepository.findOne({ where: { uuid, pays } });
        if (!typeProfil) {
            throw new NotFoundException(`Type de profil ${uuid} non trouvé pour ce pays`);
        }
        const rows = await this.registryRepository.find({
            where: { type_profil_id: typeProfil.id, pays },
        });
        const associated = new Set(rows.map((r) => r.entity));
        // Ordre canonique des entités.
        return TAGGABLE_ENTITIES.filter((e) => associated.has(e));
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
