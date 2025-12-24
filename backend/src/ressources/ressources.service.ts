import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Brackets } from 'typeorm';
import { Ressource, RessourceType } from './entities/ressource.entity';
import { CreerRessourceDto } from './dto/creer-ressource.dto';
import { MajRessourceDto } from './dto/maj-ressource.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { RessourceResponseDto } from './dto/ressource-response.dto';
import { FilterRessourceDto } from './dto/filter-ressource.dto';

@Injectable()
export class RessourcesService {
  private readonly logger = new Logger(RessourcesService.name);

  constructor(
    @InjectRepository(Ressource)
    private readonly ressourcesRepository: Repository<Ressource>,
    private readonly fichiersService: FichiersService,
  ) { }

  async create(creerRessourceDto: CreerRessourceDto, professeurId: number) {
    this.logger.log(`Création d'une ressource: ${creerRessourceDto.titre} (Type: ${creerRessourceDto.type}) par professeur ID: ${professeurId}`);
    const newRessource = new Ressource();
    newRessource.titre = creerRessourceDto.titre;
    newRessource.type = creerRessourceDto.type;
    newRessource.url = creerRessourceDto.url;
    newRessource.matiere_id = creerRessourceDto.matiere_id;
    newRessource.professeur_id = professeurId;
    newRessource.date_publication = creerRessourceDto.date_publication;
    newRessource.nombre_pages = creerRessourceDto.nombre_pages || 0;
    newRessource.nombre_telechargements = 0;
    const saved = await this.ressourcesRepository.save(newRessource);
    this.logger.log(`Ressource créée: ${saved.titre} (ID: ${saved.id}, Type: ${saved.type})`);
    return saved;
  }

  async findAll(filterDto: FilterRessourceDto): Promise<PaginationResponse<RessourceResponseDto>> {
    const { page = 1, limit = 10, search, type, matiere } = filterDto;
    this.logger.log(`Récupération des ressources - Page: ${page}, Limite: ${limit}, Search: ${search}, Type: ${type}, Matière: ${matiere}`);

    const queryBuilder = this.ressourcesRepository.createQueryBuilder('ressource')
      .leftJoinAndSelect('ressource.matiere', 'matiere')
      .leftJoinAndSelect('matiere.niveau_etude', 'niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'filiere')
      .leftJoinAndSelect('ressource.professeur', 'professeur')
      .orderBy('ressource.date_creation', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('ressource.type = :type', { type });
    }

    if (matiere) {
      queryBuilder.andWhere('matiere.nom = :matiere', { matiere });
    }

    if (filterDto.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('ressource.titre ILIKE :search', { search: `%${filterDto.search}%` })
            .orWhere('matiere.nom ILIKE :search', { search: `%${filterDto.search}%` });
        }),
      );
    }


    const [ressources, total] = await queryBuilder.getManyAndCount();


    this.logger.log(`${ressources.length} ressource(s) trouvée(s) sur ${total} total`);

    const data = ressources.map(ressource => ({
      id: ressource.id,
      titre: ressource.titre,
      type: ressource.type,
      url: ressource.url,
      date_creation: ressource.date_creation,
      date_publication: ressource.date_publication,
      nombre_pages: ressource.nombre_pages,
      nombre_telechargements: ressource.nombre_telechargements,
      professeur: {
        nom: ressource.professeur.nom,
        prenom: ressource.professeur.prenom,
        telephone: ressource.professeur.telephone,
      },
      matiere: {
        id: ressource.matiere.id,
        nom: ressource.matiere.nom,
        description: ressource.matiere.description,
        niveau_etude: {
          id: ressource.matiere.niveau_etude.id,
          nom: ressource.matiere.niveau_etude.nom,
          duree_mois: ressource.matiere.niveau_etude.duree_mois,
          filiere: {
            id: ressource.matiere.niveau_etude.filiere.id,
            nom: ressource.matiere.niveau_etude.filiere.nom,
            etablissement_id: ressource.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    this.logger.log(`Recherche de la ressource ID: ${id}`);
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
    });

    if (!ressource) {
      this.logger.warn(`Ressource ID ${id} introuvable`);
      throw new NotFoundException('Ressource non trouvée');
    }

    this.logger.log(`Ressource trouvée: ${ressource.titre} (ID: ${id}, Type: ${ressource.type})`);

    return {
      id: ressource.id,
      titre: ressource.titre,
      type: ressource.type,
      url: ressource.url,
      date_creation: ressource.date_creation,
      date_publication: ressource.date_publication,
      professeur: {
        nom: ressource.professeur.nom,
        prenom: ressource.professeur.prenom,
        telephone: ressource.professeur.telephone,
      },
      matiere: {
        id: ressource.matiere.id,
        nom: ressource.matiere.nom,
        description: ressource.matiere.description,
        niveau_etude: {
          id: ressource.matiere.niveau_etude.id,
          nom: ressource.matiere.niveau_etude.nom,
          duree_mois: ressource.matiere.niveau_etude.duree_mois,
          filiere: {
            id: ressource.matiere.niveau_etude.filiere.id,
            nom: ressource.matiere.niveau_etude.filiere.nom,
            etablissement_id: ressource.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    };
  }

  async findOneForDownload(id: string): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche de la ressource pour téléchargement - ID: ${id}`);
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!ressource) {
      this.logger.warn(`Ressource ID ${id} introuvable`);
      throw new NotFoundException('Ressource non trouvée');
    }

    if (!ressource.url) {
      this.logger.warn(`Ressource ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Cette ressource n\'a pas de fichier associé');
    }

    this.logger.log(`Ressource trouvée pour téléchargement: ${ressource.titre} (ID: ${id})`);
    return { url: ressource.url, titre: ressource.titre };
  }

  async update(id: string, majRessourceDto: MajRessourceDto) {
    this.logger.log(`Mise à jour de la ressource ID: ${id}`);
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['professeur'],
    });

    if (!ressource) {
      this.logger.warn(`Mise à jour échouée: ressource ID ${id} introuvable`);
      throw new NotFoundException('Ressource non trouvée');
    }

    Object.assign(ressource, majRessourceDto);
    const updated = await this.ressourcesRepository.save(ressource);
    this.logger.log(`Ressource mise à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de la ressource ID: ${id}`);
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!ressource) {
      this.logger.warn(`Suppression échouée: ressource ID ${id} introuvable`);
      throw new NotFoundException('Ressource non trouvée');
    }

    // Delete associated file from storage
    if (ressource.url) {
      try {
        await this.fichiersService.deleteFile(ressource.url);
      } catch (error) {
        this.logger.warn(`Failed to delete file for ressource ${id}: ${error.message}`);
        // Continue with entity deletion even if file deletion fails
      }
    }


    // Delete associated file from storage
    if (ressource.url) {
      try {
        await this.fichiersService.deleteFile(ressource.url);
      } catch (error) {
        this.logger.warn(`Failed to delete file for ressource ${id}: ${error.message}`);
      }
    }

    await this.ressourcesRepository.remove(ressource);
    this.logger.log(`Ressource supprimée: ${ressource.titre} (ID: ${id})`);
    return { message: 'Ressource supprimée avec succès' };
  }



}