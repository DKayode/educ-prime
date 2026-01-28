import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunite, OpportuniteType } from './entities/opportunite.entity';
import { CreerOpportuniteDto } from './dto/create-opportunite.dto';
import { UpdateOpportuniteDto } from './dto/update-opportunite.dto';
import { FilterOpportuniteDto, OpportuniteSortBy, OpportuniteSortOrder } from './dto/filter-opportunite.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FindOptionsWhere, Like } from 'typeorm';

@Injectable()
export class OpportunitesService {
  private readonly logger = new Logger(OpportunitesService.name);

  constructor(
    @InjectRepository(Opportunite)
    private readonly opportuniteRepository: Repository<Opportunite>,
    private readonly fichiersService: FichiersService,
  ) { }

  async create(creerOpportuniteDto: CreerOpportuniteDto) {
    this.logger.log(`Création d'une opportunité: ${creerOpportuniteDto.titre}`);
    const newOpportunite = this.opportuniteRepository.create(creerOpportuniteDto);
    const saved = await this.opportuniteRepository.save(newOpportunite);
    this.logger.log(`Opportunité créée: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(filterDto: FilterOpportuniteDto): Promise<PaginationResponse<Opportunite>> {
    const { page = 1, limit = 10, search, type, sort_by = OpportuniteSortBy.DATE, sort_order = OpportuniteSortOrder.DESC, actif } = filterDto;
    this.logger.log(`Récupération des opportunités - filtres: ${JSON.stringify(filterDto)}`);

    const queryBuilder = this.opportuniteRepository.createQueryBuilder('opportunite');

    if (search) {
      queryBuilder.andWhere(
        '(unaccent(opportunite.titre) ILIKE unaccent(:search) OR unaccent(opportunite.organisme) ILIKE unaccent(:search) OR unaccent(opportunite.lieu) ILIKE unaccent(:search))',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('opportunite.type = :type', { type });
    }

    if (actif !== undefined) {
      queryBuilder.andWhere('opportunite.actif = :actif', { actif });
    }

    // Sorting
    if (sort_by === OpportuniteSortBy.NAME) {
      queryBuilder.orderBy('opportunite.titre', sort_order);
    } else {
      // Default to date (date_publication)
      queryBuilder.orderBy('opportunite.date_publication', sort_order);
    }

    // Add secondary sort for stability
    queryBuilder.addOrderBy('opportunite.date_creation', 'DESC');

    // Pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [opportunites, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`${opportunites.length} opportunité(s) trouvée(s) sur ${total} total`);

    return {
      data: opportunites,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }


  async findOne(id: number) {
    this.logger.log(`Recherche de l'opportunité ID: ${id}`);
    const opportunite = await this.opportuniteRepository.findOne({
      where: { id },
    });

    if (!opportunite) {
      this.logger.warn(`Opportunité ID ${id} introuvable`);
      throw new NotFoundException('Opportunité non trouvée');
    }

    this.logger.log(`Opportunité trouvée: ${opportunite.titre} (ID: ${id})`);
    return opportunite;
  }

  async findOneForDownload(id: number): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche de l'opportunité pour téléchargement - ID: ${id}`);
    const opportunite = await this.opportuniteRepository.findOne({
      where: { id },
    });

    if (!opportunite) {
      this.logger.warn(`Opportunité ID ${id} introuvable`);
      throw new NotFoundException('Opportunité non trouvée');
    }

    if (!opportunite.image) {
      this.logger.warn(`Opportunité ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Cette opportunité n\'a pas de fichier associé');
    }

    this.logger.log(`Opportunité trouvée pour téléchargement: ${opportunite.titre} (ID: ${id})`);
    return { url: opportunite.image, titre: opportunite.titre };
  }

  async update(id: number, updateOpportuniteDto: UpdateOpportuniteDto) {
    this.logger.log(`Mise à jour de l'opportunité ID: ${id}`);
    const opportunite = await this.opportuniteRepository.findOne({
      where: { id },
    });

    if (!opportunite) {
      this.logger.warn(`Mise à jour échouée: opportunité ID ${id} introuvable`);
      throw new NotFoundException('Opportunité non trouvée');
    }

    Object.assign(opportunite, updateOpportuniteDto);
    const updated = await this.opportuniteRepository.save(opportunite);
    this.logger.log(`Opportunité mise à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression de l'opportunité ID: ${id}`);
    const opportunite = await this.opportuniteRepository.findOne({
      where: { id },
    });

    if (!opportunite) {
      this.logger.warn(`Suppression échouée: opportunité ID ${id} introuvable`);
      throw new NotFoundException('Opportunité non trouvée');
    }


    if (opportunite.image) {
      try {
        await this.fichiersService.deleteFile(opportunite.image);
      } catch (error) {
        this.logger.warn(`Failed to delete file for opportunite ${id}: ${error.message}`);
      }
    }

    await this.opportuniteRepository.remove(opportunite);
    this.logger.log(`Opportunité supprimée: ${opportunite.titre} (ID: ${id})`);
    return { message: 'Opportunité supprimée avec succès' };
  }
}
