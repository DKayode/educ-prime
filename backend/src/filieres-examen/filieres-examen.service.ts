import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFiliereExamenDto } from './dto/create-filiere-examen.dto';
import { UpdateFiliereExamenDto } from './dto/update-filiere-examen.dto';
import { FiliereExamenQueryDto } from './dto/filiere-examen-query.dto';
import { FiliereExamen } from './entities/filiere-examen.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class FilieresExamenService {
  constructor(
    @InjectRepository(FiliereExamen)
    private readonly filiereExamenRepository: Repository<FiliereExamen>,
    @InjectRepository(TypeExamen)
    private readonly typeExamenRepository: Repository<TypeExamen>,
  ) {}

  async create(pays: string, createDto: CreateFiliereExamenDto): Promise<FiliereExamen> {
    const typeExamen = await this.typeExamenRepository.findOne({ where: { id: createDto.type_examen_id } });
    if (!typeExamen) {
      throw new NotFoundException(`Type d'examen avec l'ID ${createDto.type_examen_id} non trouvé`);
    }
    const filiereExamen = this.filiereExamenRepository.create({ ...createDto, pays });
    return await this.filiereExamenRepository.save(filiereExamen);
  }

  async findAll(pays: string, query: FiliereExamenQueryDto): Promise<PaginationResponse<FiliereExamen>> {
    const { page = 1, limit = 10, search, type_examen, sort_order = 'ASC' } = query;
    const queryBuilder = this.filiereExamenRepository
      .createQueryBuilder('filiere_examen')
      .leftJoinAndSelect('filiere_examen.type_examen', 'type_examen')
      .where('filiere_examen.pays = :pays', { pays });
    if (type_examen) {
      queryBuilder.andWhere('filiere_examen.type_examen_id = :type_examen', { type_examen });
    }
    if (search) {
      queryBuilder.andWhere('unaccent(filiere_examen.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
    }
    queryBuilder.orderBy('filiere_examen.nom', sort_order).skip((page - 1) * limit).take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<FiliereExamen> {
    const filiereExamen = await this.filiereExamenRepository.findOne({ where: { id }, relations: ['type_examen'] });
    if (!filiereExamen) {
      throw new NotFoundException(`Filière avec l'ID ${id} non trouvée`);
    }
    return filiereExamen;
  }

  async update(id: number, updateDto: UpdateFiliereExamenDto): Promise<FiliereExamen> {
    const filiereExamen = await this.findOne(id);
    if (updateDto.type_examen_id) {
      const typeExamen = await this.typeExamenRepository.findOne({ where: { id: updateDto.type_examen_id } });
      if (!typeExamen) {
        throw new NotFoundException(`Type d'examen avec l'ID ${updateDto.type_examen_id} non trouvé`);
      }
    }
    Object.assign(filiereExamen, updateDto);
    return await this.filiereExamenRepository.save(filiereExamen);
  }

  async remove(id: number): Promise<void> {
    const filiereExamen = await this.findOne(id);
    await this.filiereExamenRepository.remove(filiereExamen);
  }
}
