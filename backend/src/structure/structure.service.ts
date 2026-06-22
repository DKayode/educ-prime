import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { StructureQueryDto } from './dto/structure-query.dto';
import { Structure } from './entities/structure.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';

@Injectable()
export class StructureService {
  constructor(private readonly resolver: DataSourceResolver) {}

  private get structureRepository(): Repository<Structure> {
    return this.resolver.getRepository(Structure);
  }

  async create(createStructureDto: CreateStructureDto): Promise<Structure> {
    const structure = this.structureRepository.create(createStructureDto);
    return await this.structureRepository.save(structure);
  }

  async findAll(query: StructureQueryDto): Promise<{
    data: Structure[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 10, search, sort_by = 'nom', sort_order = 'ASC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.structureRepository.createQueryBuilder('structure');

    if (search) {
      queryBuilder.where(
        '(unaccent(structure.nom) ILIKE unaccent(:search) OR unaccent(structure.description) ILIKE unaccent(:search))',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`structure.${sort_by}`, sort_order);
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Structure> {
    const structure = await this.structureRepository.findOne({ where: { id } });

    if (!structure) {
      throw new NotFoundException(`Structure avec l'ID ${id} non trouvée`);
    }

    return structure;
  }

  async update(id: number, updateStructureDto: UpdateStructureDto): Promise<Structure> {
    const structure = await this.findOne(id);
    Object.assign(structure, updateStructureDto);
    return await this.structureRepository.save(structure);
  }

  async remove(id: number): Promise<void> {
    const structure = await this.findOne(id);
    await this.structureRepository.remove(structure);
  }
}
