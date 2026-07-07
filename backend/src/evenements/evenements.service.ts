import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { Repository } from 'typeorm';
import { Evenement } from './entities/evenement.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CreerEvenementDto } from './dto/create-evenement.dto';
import { UpdateEvenementDto } from './dto/update-evenement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FilterEvenementDto, EvenementSortBy } from './dto/filter-evenement.dto';
import {
  TypeProfilVisibilityService,
  TypeProfilJoinConfig,
  ViewerContext,
} from '../type-profils/type-profil-visibility.service';

@Injectable()
export class EvenementsService {
  private readonly logger = new Logger(EvenementsService.name);

  private readonly typeProfilJoin: TypeProfilJoinConfig = {
    entity: 'evenement',
    joinTable: 'evenement_type_profils',
    fkColumn: 'evenement_id',
  };

  constructor(
    private readonly resolver: DataSourceResolver,
    private readonly fichiersService: FichiersService,
    private readonly typeProfilVisibility: TypeProfilVisibilityService,
  ) { }

  private get evenementRepository(): Repository<Evenement> {
    return this.resolver.getRepository(Evenement);
  }

  /** Lit la checklist de types de profil taguée sur un événement. */
  async getTypeProfilIds(id: number): Promise<{ typeProfilIds: number[] }> {
    await this.findOne(id);
    const typeProfilIds = await this.typeProfilVisibility.getTypeProfilIds(this.typeProfilJoin, id);
    return { typeProfilIds };
  }

  /** Remplace (replace-set) la checklist de types de profil d'un événement. */
  async setTypeProfilIds(id: number, typeProfilIds: number[]): Promise<{ typeProfilIds: number[] }> {
    await this.findOne(id);
    const saved = await this.typeProfilVisibility.setTypeProfilIds(this.typeProfilJoin, id, typeProfilIds);
    return { typeProfilIds: saved };
  }

  async create(creerEvenementDto: CreerEvenementDto) {
    this.logger.log(`Création d'un événement: ${creerEvenementDto.titre}`);
    const newEvenement = this.evenementRepository.create(creerEvenementDto);
    const saved = await this.evenementRepository.save(newEvenement);
    this.logger.log(`Événement créé: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }



  async findAll(filterDto: FilterEvenementDto, viewer?: ViewerContext): Promise<PaginationResponse<Evenement>> {
    const { page = 1, limit = 10, search, sort_by, sort_order = 'DESC' } = filterDto;
    this.logger.log(`Récupération des événements - Page: ${page}, Limit: ${limit}, SortBy: ${sort_by}, Order: ${sort_order}`);

    const queryBuilder = this.evenementRepository.createQueryBuilder('evenement');

    if (search) {
      queryBuilder.andWhere(
        '(unaccent(evenement.titre) ILIKE unaccent(:search) OR unaccent(evenement.lieu) ILIKE unaccent(:search))',
        { search: `%${search}%` }
      );
    }

    if (filterDto.actif !== undefined) {
      queryBuilder.andWhere('evenement.actif = :actif', { actif: filterDto.actif });
    }

    if (sort_by === EvenementSortBy.DATE) {
      if (sort_order === 'ASC') {
        queryBuilder.orderBy('evenement.date', 'ASC', 'NULLS LAST');
      } else {
        queryBuilder.orderBy('evenement.date', 'DESC');
      }
      // Secondary sort to ensure stability
      queryBuilder.addOrderBy('evenement.date_creation', 'DESC');
    } else if (sort_by === EvenementSortBy.NAME) {
      queryBuilder.orderBy('evenement.titre', sort_order);
      queryBuilder.addOrderBy('evenement.date_creation', 'DESC');
    } else {
      // Default sort
      queryBuilder.orderBy('evenement.date', 'DESC');
      queryBuilder.addOrderBy('evenement.date_creation', 'DESC');
    }

    // Visibilité par type de profil : non-admin ⇒ non-tagué OU partage son type_profil.
    await this.typeProfilVisibility.applyVisibilityFilter(queryBuilder, 'evenement', this.typeProfilJoin, viewer);

    const [evenements, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    this.logger.log(`${evenements.length} événement(s) trouvé(s) sur ${total} total`);

    return {
      data: evenements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    this.logger.log(`Recherche de l'événement ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }

    this.logger.log(`Événement trouvé: ${evenement.titre} (ID: ${id})`);
    return evenement;
  }

  async findOneForDownload(id: number): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche de l'événement pour téléchargement - ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }

    if (!evenement.image) {
      this.logger.warn(`Événement ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Cet événement n\'a pas de fichier associé');
    }

    this.logger.log(`Événement trouvé pour téléchargement: ${evenement.titre} (ID: ${id})`);
    return { url: evenement.image, titre: evenement.titre };
  }

  async update(id: number, updateEvenementDto: UpdateEvenementDto) {
    this.logger.log(`Mise à jour de l'événement ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Mise à jour échouée: événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }

    Object.assign(evenement, updateEvenementDto);
    const updated = await this.evenementRepository.save(evenement);
    this.logger.log(`Événement mis à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression de l'événement ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Suppression échouée: événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }


    if (evenement.image) {
      try {
        await this.fichiersService.deleteFile(evenement.image);
      } catch (error) {
        this.logger.warn(`Failed to delete file for evenement ${id}: ${error.message}`);
      }
    }

    await this.evenementRepository.remove(evenement);
    this.logger.log(`Événement supprimé: ${evenement.titre} (ID: ${id})`);
    return { message: 'Événement supprimé avec succès' };
  }
}
