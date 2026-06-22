import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateTitreDto } from './dto/create-titre.dto';
import { UpdateTitreDto } from './dto/update-titre.dto';
import { TitreQueryDto } from './dto/titre-query.dto';
import { Titre } from './entities/titre.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';

@Injectable()
export class TitreService {
  constructor(private readonly resolver: DataSourceResolver) {}

  private get titreRepository(): Repository<Titre> {
    return this.resolver.getRepository(Titre);
  }

  async create(createTitreDto: CreateTitreDto): Promise<Titre> {
    const titre = this.titreRepository.create(createTitreDto);
    return await this.titreRepository.save(titre);
  }

  async findAll(query: TitreQueryDto): Promise<{
    data: Titre[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 10, search, sort_by = 'nom', sort_order = 'ASC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.titreRepository.createQueryBuilder('titre');

    if (search) {
      queryBuilder.where(
        '(unaccent(titre.nom) ILIKE unaccent(:search) OR unaccent(titre.description) ILIKE unaccent(:search))',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`titre.${sort_by}`, sort_order);
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Titre> {
    const titre = await this.titreRepository.findOne({ where: { id } });

    if (!titre) {
      throw new NotFoundException(`Titre avec l'ID ${id} non trouvé`);
    }

    return titre;
  }

  async update(id: number, updateTitreDto: UpdateTitreDto): Promise<Titre> {
    const titre = await this.findOne(id);
    Object.assign(titre, updateTitreDto);
    return await this.titreRepository.save(titre);
  }

  async remove(id: number): Promise<void> {
    const titre = await this.findOne(id);
    await this.titreRepository.remove(titre);
  }
}
