import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSerieDto } from './dto/create-serie.dto';
import { UpdateSerieDto } from './dto/update-serie.dto';
import { SerieQueryDto } from './dto/serie-query.dto';
import { Serie } from './entities/serie.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(Serie)
    private readonly serieRepository: Repository<Serie>,
    @InjectRepository(TypeExamen)
    private readonly typeExamenRepository: Repository<TypeExamen>,
  ) {}

  // pays cascades from the parent type d'examen (validated to belong to the
  // request country); type_examen_id comes from the DTO.
  async create(pays: string, createSerieDto: CreateSerieDto): Promise<Serie> {
    const typeExamen = await this.typeExamenRepository.findOne({
      where: { id: createSerieDto.type_examen_id, pays },
    });
    if (!typeExamen) {
      throw new NotFoundException(
        `Type d'examen ${createSerieDto.type_examen_id} introuvable pour ce pays`,
      );
    }

    const serie = this.serieRepository.create({
      nom: createSerieDto.nom,
      description: createSerieDto.description,
      type_examen_id: typeExamen.id,
      pays: typeExamen.pays,
    });
    const saved = await this.serieRepository.save(serie);
    // reload with the type_examen relation so the response carries it
    return this.findOne(pays, saved.id);
  }

  async findAll(pays: string, query: SerieQueryDto): Promise<PaginationResponse<Serie>> {
    const { page = 1, limit = 10, search, type_examen, sort_order = 'ASC' } = query;

    const queryBuilder = this.serieRepository
      .createQueryBuilder('serie')
      .leftJoinAndSelect('serie.type_examen', 'type_examen')
      .where('serie.pays = :pays', { pays })
      .orderBy('serie.nom', sort_order)
      .skip((page - 1) * limit)
      .take(limit);

    if (type_examen) {
      queryBuilder.andWhere('serie.type_examen_id = :type_examen', { type_examen });
    }

    if (search) {
      queryBuilder.andWhere('unaccent(serie.nom) ILIKE unaccent(:search)', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(pays: string, id: number): Promise<Serie> {
    const serie = await this.serieRepository.findOne({
      where: { id, pays },
      relations: ['type_examen'],
    });

    if (!serie) {
      throw new NotFoundException(`Série avec l'ID ${id} non trouvée`);
    }

    return serie;
  }

  async update(pays: string, id: number, updateSerieDto: UpdateSerieDto): Promise<Serie> {
    const serie = await this.findOne(pays, id);

    if (
      updateSerieDto.type_examen_id &&
      updateSerieDto.type_examen_id !== serie.type_examen_id
    ) {
      const typeExamen = await this.typeExamenRepository.findOne({
        where: { id: updateSerieDto.type_examen_id, pays },
      });
      if (!typeExamen) {
        throw new NotFoundException(
          `Type d'examen ${updateSerieDto.type_examen_id} introuvable pour ce pays`,
        );
      }
      serie.type_examen_id = typeExamen.id;
      serie.pays = typeExamen.pays;
    }

    if (updateSerieDto.nom !== undefined) serie.nom = updateSerieDto.nom;
    if (updateSerieDto.description !== undefined) serie.description = updateSerieDto.description;

    const saved = await this.serieRepository.save(serie);
    // reload with the (possibly changed) type_examen relation for the response
    return this.findOne(pays, saved.id);
  }

  async remove(pays: string, id: number): Promise<void> {
    const serie = await this.findOne(pays, id);
    await this.serieRepository.remove(serie);
  }
}
