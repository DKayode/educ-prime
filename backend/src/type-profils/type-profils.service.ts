import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { TypeProfil } from './entities/type-profil.entity';
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
