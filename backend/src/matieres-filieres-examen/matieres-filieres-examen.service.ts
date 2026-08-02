import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMatiereFiliereExamenDto } from './dto/create-matiere-filiere-examen.dto';
import { UpdateMatiereFiliereExamenDto } from './dto/update-matiere-filiere-examen.dto';
import { MatiereFiliereExamenQueryDto } from './dto/matiere-filiere-examen-query.dto';
import { MatiereFiliereExamen } from './entities/matiere-filiere-examen.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class MatieresFilieresExamenService {
  constructor(
    @InjectRepository(MatiereFiliereExamen)
    private readonly matiereFiliereExamenRepository: Repository<MatiereFiliereExamen>,
    @InjectRepository(TypeExamen)
    private readonly typeExamenRepository: Repository<TypeExamen>,
  ) {}

  async create(
    pays: string,
    createDto: CreateMatiereFiliereExamenDto,
  ): Promise<MatiereFiliereExamen> {
    const typeExamen = await this.typeExamenRepository.findOne({
      where: { id: createDto.type_examen_id },
    });

    if (!typeExamen) {
      throw new NotFoundException(
        `Type d'examen avec l'ID ${createDto.type_examen_id} non trouvé`,
      );
    }

    const matiereFiliereExamen = this.matiereFiliereExamenRepository.create({
      ...createDto,
      pays,
    });
    return await this.matiereFiliereExamenRepository.save(matiereFiliereExamen);
  }

  async findAll(
    pays: string,
    query: MatiereFiliereExamenQueryDto,
  ): Promise<PaginationResponse<MatiereFiliereExamen>> {
    const { page = 1, limit = 10, search, type_examen, sort_order = 'ASC' } = query;

    const queryBuilder = this.matiereFiliereExamenRepository
      .createQueryBuilder('matiere_filiere_examen')
      .leftJoinAndSelect('matiere_filiere_examen.type_examen', 'type_examen')
      .where('matiere_filiere_examen.pays = :pays', { pays });

    if (type_examen) {
      queryBuilder.andWhere('matiere_filiere_examen.type_examen_id = :type_examen', {
        type_examen,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        'unaccent(matiere_filiere_examen.nom) ILIKE unaccent(:search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('matiere_filiere_examen.nom', sort_order)
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

  async findOne(id: number): Promise<MatiereFiliereExamen> {
    const matiereFiliereExamen = await this.matiereFiliereExamenRepository.findOne({
      where: { id },
      relations: ['type_examen'],
    });

    if (!matiereFiliereExamen) {
      throw new NotFoundException(`Matière/filière avec l'ID ${id} non trouvée`);
    }

    return matiereFiliereExamen;
  }

  async update(
    id: number,
    updateDto: UpdateMatiereFiliereExamenDto,
  ): Promise<MatiereFiliereExamen> {
    const matiereFiliereExamen = await this.findOne(id);

    if (updateDto.type_examen_id) {
      const typeExamen = await this.typeExamenRepository.findOne({
        where: { id: updateDto.type_examen_id },
      });

      if (!typeExamen) {
        throw new NotFoundException(
          `Type d'examen avec l'ID ${updateDto.type_examen_id} non trouvé`,
        );
      }
    }

    Object.assign(matiereFiliereExamen, updateDto);
    return await this.matiereFiliereExamenRepository.save(matiereFiliereExamen);
  }

  async remove(id: number): Promise<void> {
    const matiereFiliereExamen = await this.findOne(id);
    await this.matiereFiliereExamenRepository.remove(matiereFiliereExamen);
  }
}
