import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTypeExamenDto } from './dto/create-type-examen.dto';
import { UpdateTypeExamenDto } from './dto/update-type-examen.dto';
import { TypeExamenQueryDto } from './dto/type-examen-query.dto';
import { TypeExamen } from './entities/type-examen.entity';

@Injectable()
export class TypesExamenService {
  constructor(
    @InjectRepository(TypeExamen)
    private readonly typesExamenRepository: Repository<TypeExamen>,
  ) {}

  async create(pays: string, createTypeExamenDto: CreateTypeExamenDto): Promise<TypeExamen> {
    const typeExamen = this.typesExamenRepository.create({ ...createTypeExamenDto, pays });
    return await this.typesExamenRepository.save(typeExamen);
  }

  async findAll(pays: string, query: TypeExamenQueryDto): Promise<{
    data: TypeExamen[];
    total: number; page: number; limit: number; totalPages: number;
  }> {
    const { page = 1, limit = 10, search, sort_by = 'nom', sort_order = 'ASC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.typesExamenRepository
      .createQueryBuilder('type_examen')
      .where('type_examen.pays = :pays', { pays });

    if (search) {
      queryBuilder.andWhere(
        '(unaccent(type_examen.nom) ILIKE unaccent(:search) OR unaccent(type_examen.description) ILIKE unaccent(:search))',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`type_examen.${sort_by}`, sort_order);
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<TypeExamen> {
    const typeExamen = await this.typesExamenRepository.findOne({ where: { id } });

    if (!typeExamen) {
      throw new NotFoundException(`Type d'examen avec l'ID ${id} non trouvé`);
    }

    return typeExamen;
  }

  async update(id: number, updateTypeExamenDto: UpdateTypeExamenDto): Promise<TypeExamen> {
    const typeExamen = await this.findOne(id);
    Object.assign(typeExamen, updateTypeExamenDto);
    return await this.typesExamenRepository.save(typeExamen);
  }

  async remove(id: number): Promise<void> {
    const typeExamen = await this.findOne(id);
    await this.typesExamenRepository.remove(typeExamen);
  }
}
