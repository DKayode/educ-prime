import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Brackets } from 'typeorm';
import { Filiere } from './entities/filiere.entity';
import { CreerFiliereDto } from './dto/creer-filiere.dto';
import { MajFiliereDto } from './dto/maj-filiere.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FilterFiliereDto } from './dto/filter-filiere.dto';
import { FiliereResponseDto } from './dto/filiere-response.dto';

@Injectable()
export class FilieresService {
  private readonly logger = new Logger(FilieresService.name);

  constructor(
    @InjectRepository(Filiere)
    private readonly filieresRepository: Repository<Filiere>,
  ) { }

  async create(creerFiliereDto: CreerFiliereDto) {
    this.logger.log(`Création d'une filière: ${creerFiliereDto.nom} (Établissement ID: ${creerFiliereDto.etablissement_id})`);
    const newFiliere = this.filieresRepository.create({
      nom: creerFiliereDto.nom,
      etablissement: { id: creerFiliereDto.etablissement_id } as any,
    });
    const saved = await this.filieresRepository.save(newFiliere);
    this.logger.log(`Filière créée: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(filterDto: FilterFiliereDto): Promise<PaginationResponse<FiliereResponseDto>> {
    const { page = 1, limit = 10, search, etablissement } = filterDto;
    this.logger.log(`Récupération des filières - Page: ${page}, Limite: ${limit}, Search: ${search}, Etablissement: ${etablissement}`);

    const queryBuilder = this.filieresRepository.createQueryBuilder('filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .orderBy('filiere.nom', filterDto.sort_order || 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (etablissement) {
      queryBuilder.andWhere('etablissement.nom = :etablissement', { etablissement });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('filiere.nom ILIKE :search', { search: `%${search}%` })
            .orWhere('etablissement.nom ILIKE :search', { search: `%${search}%` })
            .orWhere('etablissement.ville ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    const [filieres, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`${filieres.length} filière(s) trouvée(s) sur ${total} total`);

    const data = filieres.map(filiere => ({
      id: filiere.id,
      nom: filiere.nom,
      etablissement: filiere.etablissement,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<FiliereResponseDto> {
    this.logger.log(`Recherche de la filière ID: ${id}`);
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['etablissement'],
    });

    if (!filiere) {
      this.logger.warn(`Filière ID ${id} introuvable`);
      throw new NotFoundException('Filière non trouvée');
    }

    this.logger.log(`Filière trouvée: ${filiere.nom} (ID: ${id})`);

    return {
      id: filiere.id,
      nom: filiere.nom,
      etablissement: filiere.etablissement,
    };
  }

  async update(id: string, majFiliereDto: MajFiliereDto) {
    this.logger.log(`Mise à jour de la filière ID: ${id}`);
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!filiere) {
      this.logger.warn(`Mise à jour échouée: filière ID ${id} introuvable`);
      throw new NotFoundException('Filière non trouvée');
    }

    if (majFiliereDto.nom) {
      filiere.nom = majFiliereDto.nom;
    }

    if (majFiliereDto.etablissement_id) {
      filiere.etablissement = { id: majFiliereDto.etablissement_id } as any;
    }

    const updated = await this.filieresRepository.save(filiere);
    this.logger.log(`Filière mise à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de la filière ID: ${id}`);
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!filiere) {
      this.logger.warn(`Suppression échouée: filière ID ${id} introuvable`);
      throw new NotFoundException('Filière non trouvée');
    }

    try {
      await this.filieresRepository.remove(filiere);
      this.logger.log(`Filière supprimée: ${filiere.nom} (ID: ${id})`);
      return { message: 'Filière supprimée avec succès' };
    } catch (error) {
      if (error.code === '23503') {
        throw new ConflictException('Impossible de supprimer cette filière car des niveaux d\'étude y sont associés. Veuillez d\'abord supprimer les niveaux d\'étude.');
      }
      throw error;
    }
  }

  async findByEtablissement(etablissementId: string) {
    this.logger.log(`Recherche des filières pour établissement ID: ${etablissementId}`);
    const filieres = await this.filieresRepository.find({
      where: { etablissement: { id: parseInt(etablissementId) } },
    });
    this.logger.log(`${filieres.length} filière(s) trouvée(s) pour établissement ${etablissementId}`);
    return filieres;
  }
}