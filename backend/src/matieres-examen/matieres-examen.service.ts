import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMatiereExamenDto } from './dto/create-matiere-examen.dto';
import { UpdateMatiereExamenDto } from './dto/update-matiere-examen.dto';
import { MatiereExamenQueryDto } from './dto/matiere-examen-query.dto';
import { MatiereExamen } from './entities/matiere-examen.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class MatieresExamenService {
  constructor(
    @InjectRepository(MatiereExamen)
    private readonly matiereExamenRepository: Repository<MatiereExamen>,
    @InjectRepository(TypeExamen)
    private readonly typeExamenRepository: Repository<TypeExamen>,
  ) {}

  async create(pays: string, createDto: CreateMatiereExamenDto): Promise<MatiereExamen> {
    const typeExamen = await this.typeExamenRepository.findOne({ where: { id: createDto.type_examen_id } });
    if (!typeExamen) {
      throw new NotFoundException(`Type d'examen avec l'ID ${createDto.type_examen_id} non trouvé`);
    }
    const matiereExamen = this.matiereExamenRepository.create({ ...createDto, pays });
    return await this.matiereExamenRepository.save(matiereExamen);
  }

  async findAll(pays: string, query: MatiereExamenQueryDto): Promise<PaginationResponse<MatiereExamen>> {
    const { page = 1, limit = 10, search, type_examen, sort_order = 'ASC' } = query;
    const queryBuilder = this.matiereExamenRepository
      .createQueryBuilder('matiere_examen')
      .leftJoinAndSelect('matiere_examen.type_examen', 'type_examen')
      .where('matiere_examen.pays = :pays', { pays });
    if (type_examen) {
      queryBuilder.andWhere('matiere_examen.type_examen_id = :type_examen', { type_examen });
    }
    if (search) {
      queryBuilder.andWhere('unaccent(matiere_examen.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
    }
    queryBuilder.orderBy('matiere_examen.nom', sort_order).skip((page - 1) * limit).take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<MatiereExamen> {
    const matiereExamen = await this.matiereExamenRepository.findOne({ where: { id }, relations: ['type_examen'] });
    if (!matiereExamen) {
      throw new NotFoundException(`Matière avec l'ID ${id} non trouvée`);
    }
    return matiereExamen;
  }

  async update(id: number, updateDto: UpdateMatiereExamenDto): Promise<MatiereExamen> {
    const matiereExamen = await this.findOne(id);
    if (updateDto.type_examen_id) {
      const typeExamen = await this.typeExamenRepository.findOne({ where: { id: updateDto.type_examen_id } });
      if (!typeExamen) {
        throw new NotFoundException(`Type d'examen avec l'ID ${updateDto.type_examen_id} non trouvé`);
      }
    }
    Object.assign(matiereExamen, updateDto);
    return await this.matiereExamenRepository.save(matiereExamen);
  }

  async remove(id: number): Promise<void> {
    const matiereExamen = await this.findOne(id);
    await this.matiereExamenRepository.remove(matiereExamen);
  }
}
