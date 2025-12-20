import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Epreuve } from './entities/epreuve.entity';
import { CreerEpreuveDto } from './dto/creer-epreuve.dto';
import { MajEpreuveDto } from './dto/maj-epreuve.dto';
import { FilterEpreuveDto } from './dto/filter-epreuve.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { EpreuveResponseDto } from './dto/epreuve-response.dto';

@Injectable()
export class EpreuvesService {
  private readonly logger = new Logger(EpreuvesService.name);

  constructor(
    @InjectRepository(Epreuve)
    private readonly epreuvesRepository: Repository<Epreuve>,
    private readonly fichiersService: FichiersService,
  ) { }

  async create(creerEpreuveDto: CreerEpreuveDto, professeurId: number) {
    this.logger.log(`Création d'une épreuve: ${creerEpreuveDto.titre} par professeur ID: ${professeurId}`);
    const newEpreuve = new Epreuve();
    newEpreuve.titre = creerEpreuveDto.titre;
    newEpreuve.url = creerEpreuveDto.url;
    newEpreuve.duree_minutes = creerEpreuveDto.duree_minutes;
    newEpreuve.matiere_id = creerEpreuveDto.matiere_id;
    newEpreuve.professeur_id = professeurId;
    newEpreuve.date_publication = creerEpreuveDto.date_publication;
    newEpreuve.nombre_pages = creerEpreuveDto.nombre_pages;
    newEpreuve.type = creerEpreuveDto.type;
    const saved = await this.epreuvesRepository.save(newEpreuve);
    this.logger.log(`Épreuve créée: ${saved.titre} (ID: ${saved.id}, Matière: ${saved.matiere_id})`);
    return saved;
  }

  async findAll(filterDto: FilterEpreuveDto): Promise<PaginationResponse<EpreuveResponseDto>> {
    const { page = 1, limit = 10, titre, type } = filterDto;
    this.logger.log(`Récupération des épreuves - Page: ${page}, Limite: ${limit}, Titre: ${titre}, Type: ${type}`);

    const whereCondition: FindOptionsWhere<Epreuve> = {};

    if (titre) {
      whereCondition.titre = Like(`%${titre}%`);
    }

    if (type) {
      whereCondition.type = type;
    }

    const [epreuves, total] = await this.epreuvesRepository.findAndCount({
      where: whereCondition,
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s) sur ${total} total`);

    // Transform to response DTO format with sanitized professeur
    const data = epreuves.map(epreuve => ({
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      nombre_pages: epreuve.nombre_pages,
      nombre_telechargements: epreuve.nombre_telechargements,
      type: epreuve.type,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
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
    this.logger.log(`Recherche de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
    });

    if (!epreuve) {
      this.logger.warn(`Épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    this.logger.log(`Épreuve trouvée: ${epreuve.titre} (ID: ${id})`);

    // Transform to response DTO format with sanitized professeur
    return {
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      nombre_pages: epreuve.nombre_pages,
      nombre_telechargements: epreuve.nombre_telechargements,
      type: epreuve.type,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    };
  }

  async findOneForDownload(id: string): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche de l'épreuve pour téléchargement - ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!epreuve) {
      this.logger.warn(`Épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    if (!epreuve.url) {
      this.logger.warn(`Épreuve ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Cette épreuve n\'a pas de fichier associé');
    }

    this.logger.log(`Épreuve trouvée pour téléchargement: ${epreuve.titre} (ID: ${id})`);

    // Increment download count
    epreuve.nombre_telechargements = (epreuve.nombre_telechargements || 0) + 1;
    await this.epreuvesRepository.save(epreuve);

    return { url: epreuve.url, titre: epreuve.titre };
  }

  async update(id: string, majEpreuveDto: MajEpreuveDto) {
    this.logger.log(`Mise à jour de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['professeur'],
    });

    if (!epreuve) {
      this.logger.warn(`Mise à jour échouée: épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    Object.assign(epreuve, majEpreuveDto);
    const updated = await this.epreuvesRepository.save(epreuve);
    this.logger.log(`Épreuve mise à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!epreuve) {
      this.logger.warn(`Suppression échouée: épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }


    // Delete associated file from storage
    if (epreuve.url) {
      try {
        await this.fichiersService.deleteFile(epreuve.url);
      } catch (error) {
        this.logger.warn(`Failed to delete file for epreuve ${id}: ${error.message}`);
      }
    }

    await this.epreuvesRepository.remove(epreuve);
    this.logger.log(`Épreuve supprimée: ${epreuve.titre} (ID: ${id})`);
    return { message: 'Épreuve supprimée avec succès' };
  }

  async findByMatiere(matiereId: string, paginationDto: PaginationDto): Promise<PaginationResponse<EpreuveResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Recherche des épreuves pour matière ID: ${matiereId} - Page: ${page}, Limite: ${limit}`);

    const [epreuves, total] = await this.epreuvesRepository.findAndCount({
      where: { matiere: { id: parseInt(matiereId) } },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s) pour matière ${matiereId} sur ${total} total`);

    // Transform to response DTO format with sanitized professeur
    const data = epreuves.map(epreuve => ({
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      nombre_pages: epreuve.nombre_pages,
      nombre_telechargements: epreuve.nombre_telechargements,
      type: epreuve.type,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
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

  async findByProfesseur(professeurId: string, paginationDto: PaginationDto): Promise<PaginationResponse<EpreuveResponseDto>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Recherche des épreuves du professeur ID: ${professeurId} - Page: ${page}, Limite: ${limit}`);

    const [epreuves, total] = await this.epreuvesRepository.findAndCount({
      where: { professeur: { id: parseInt(professeurId) } },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s) pour professeur ${professeurId} sur ${total} total`);

    // Transform to response DTO format with sanitized professeur
    const data = epreuves.map(epreuve => ({
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      nombre_pages: epreuve.nombre_pages,
      nombre_telechargements: epreuve.nombre_telechargements,
      type: epreuve.type,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
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
}