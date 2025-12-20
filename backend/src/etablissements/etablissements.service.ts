import { Injectable, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Etablissement } from './entities/etablissement.entity';
import { Filiere } from '../filieres/entities/filiere.entity';
import { NiveauEtude } from '../niveau-etude/entities/niveau-etude.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { Ressource } from '../ressources/entities/ressource.entity';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FilterEtablissementDto } from './dto/filter-etablissement.dto';
import { FilterFiliereDto } from '../filieres/dto/filter-filiere.dto';
import { FilterNiveauEtudeDto } from '../niveau-etude/dto/filter-niveau-etude.dto';
import { FichiersService } from '../fichiers/fichiers.service';

@Injectable()
export class EtablissementsService {
  private readonly logger = new Logger(EtablissementsService.name);

  constructor(
    @InjectRepository(Etablissement)
    private readonly etablissementsRepository: Repository<Etablissement>,
    @InjectRepository(Filiere)
    private readonly filieresRepository: Repository<Filiere>,
    @InjectRepository(NiveauEtude)
    private readonly niveauEtudeRepository: Repository<NiveauEtude>,
    @InjectRepository(Matiere)
    private readonly matieresRepository: Repository<Matiere>,
    @InjectRepository(Epreuve)
    private readonly epreuvesRepository: Repository<Epreuve>,
    @InjectRepository(Ressource)
    private readonly ressourcesRepository: Repository<Ressource>,
    private readonly fichiersService: FichiersService,
  ) { }

  async create(creerEtablissementDto: CreerEtablissementDto) {
    this.logger.log(`Création d'un établissement: ${creerEtablissementDto.nom}`);
    const newEtablissement = this.etablissementsRepository.create(creerEtablissementDto);
    const saved = await this.etablissementsRepository.save(newEtablissement);
    this.logger.log(`Établissement créé: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(filterDto: FilterEtablissementDto): Promise<PaginationResponse<Etablissement>> {
    const { page = 1, limit = 10, nom, ville } = filterDto;
    this.logger.log(`Récupération des établissements - Page: ${page}, Limite: ${limit}, Nom: ${nom}, Ville: ${ville}`);

    const whereCondition: FindOptionsWhere<Etablissement> = {};

    if (nom) {
      whereCondition.nom = Like(`%${nom}%`);
    }

    if (ville) {
      whereCondition.ville = Like(`%${ville}%`);
    }

    const [etablissements, total] = await this.etablissementsRepository.findAndCount({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${etablissements.length} établissement(s) trouvé(s) sur ${total} total`);

    const data = etablissements.map(e => ({
      ...e,
      logo: e.logo ? 'present' : null
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
    this.logger.log(`Recherche de l'établissement ID: ${id}`);
    const etablissement = await this.etablissementsRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!etablissement) {
      this.logger.warn(`Établissement ID ${id} introuvable`);
      throw new NotFoundException('Établissement non trouvé');
    }

    this.logger.log(`Établissement trouvé: ${etablissement.nom} (ID: ${id})`);
    return etablissement;
  }

  async getLogo(id: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    this.logger.log(`Récupération du logo pour l'établissement ID: ${id}`);
    const etablissement = await this.findOne(id);

    if (!etablissement.logo) {
      throw new NotFoundException('Logo non trouvé pour cet établissement');
    }

    return this.fichiersService.downloadFile(etablissement.logo);
  }

  async update(id: string, majEtablissementDto: MajEtablissementDto) {
    this.logger.log(`Mise à jour de l'établissement ID: ${id}`);
    const etablissement = await this.etablissementsRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!etablissement) {
      this.logger.warn(`Mise à jour échouée: établissement ID ${id} introuvable`);
      throw new NotFoundException('Établissement non trouvé');
    }

    Object.assign(etablissement, majEtablissementDto);
    const updated = await this.etablissementsRepository.save(etablissement);
    this.logger.log(`Établissement mis à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de l'établissement ID: ${id}`);
    const etablissement = await this.etablissementsRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!etablissement) {
      this.logger.warn(`Suppression échouée: établissement ID ${id} introuvable`);
      throw new NotFoundException('Établissement non trouvé');
    }

    try {
      await this.etablissementsRepository.remove(etablissement);
      this.logger.log(`Établissement supprimé: ${etablissement.nom} (ID: ${id})`);
      return { message: 'Établissement supprimé avec succès' };
    } catch (error) {
      if (error.code === '23503') {
        throw new ConflictException('Impossible de supprimer cet établissement car des filières y sont associées. Veuillez d\'abord supprimer les filières.');
      }
      throw error;
    }
  }

  // Hierarchical navigation methods
  async findFilieresById(id: string, filterDto: FilterFiliereDto): Promise<PaginationResponse<Filiere>> {
    const { page = 1, limit = 10, nom } = filterDto;
    this.logger.log(`Récupération des filières pour établissement ID: ${id} - Page: ${page}, Limite: ${limit}, Nom: ${nom}`);
    await this.findOne(id); // Verify etablissement exists

    const whereCondition: FindOptionsWhere<Filiere> = {
      etablissement: { id: parseInt(id) },
    };

    if (nom) {
      whereCondition.nom = Like(`%${nom}%`);
    }

    const [filieres, total] = await this.filieresRepository.findAndCount({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${filieres.length} filière(s) trouvée(s) pour établissement ${id} sur ${total} total`);

    return {
      data: filieres,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNiveauEtudeByFiliere(etablissementId: string, filiereId: string, filterDto: FilterNiveauEtudeDto): Promise<PaginationResponse<NiveauEtude>> {
    const { page = 1, limit = 10, nom } = filterDto;
    this.logger.log(`Récupération des niveaux d'étude pour filière ID: ${filiereId} - Page: ${page}, Limite: ${limit}, Nom: ${nom}`);

    // Verify filiere belongs to etablissement
    const filiere = await this.filieresRepository.findOne({
      where: {
        id: parseInt(filiereId),
        etablissement: { id: parseInt(etablissementId) }
      },
    });

    if (!filiere) {
      throw new NotFoundException('Filière non trouvée pour cet établissement');
    }

    const whereCondition: FindOptionsWhere<NiveauEtude> = {
      filiere: { id: parseInt(filiereId) },
    };

    if (nom) {
      whereCondition.nom = Like(`%${nom}%`);
    }

    const [niveaux, total] = await this.niveauEtudeRepository.findAndCount({
      where: whereCondition,
      relations: ['filiere'],
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${niveaux.length} niveau(x) d'étude trouvé(s) pour filière ${filiereId} sur ${total} total`);

    return {
      data: niveaux.map(niveau => ({
        id: niveau.id,
        nom: niveau.nom,
        duree_mois: niveau.duree_mois,
        filiere: {
          id: niveau.filiere.id,
          nom: niveau.filiere.nom,
          etablissement_id: niveau.filiere.etablissement_id,
        },
      })) as NiveauEtude[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMatieresByNiveauEtude(etablissementId: string, filiereId: string, niveauEtudeId: string, paginationDto: PaginationDto = {}): Promise<PaginationResponse<Matiere>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Récupération des matières pour niveau d'étude ID: ${niveauEtudeId} - Page: ${page}, Limite: ${limit}`);

    // Verify niveau_etude belongs to filiere and etablissement
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: {
        id: parseInt(niveauEtudeId),
        filiere: {
          id: parseInt(filiereId),
          etablissement: { id: parseInt(etablissementId) }
        }
      },
    });

    if (!niveauEtude) {
      throw new NotFoundException('Niveau d\'étude non trouvé pour cette filière');
    }

    const [matieres, total] = await this.matieresRepository.findAndCount({
      where: { niveau_etude: { id: parseInt(niveauEtudeId) } },
      relations: ['niveau_etude', 'niveau_etude.filiere'],
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${matieres.length} matière(s) trouvée(s) pour niveau d'étude ${niveauEtudeId} sur ${total} total`);

    return {
      data: matieres.map(matiere => ({
        id: matiere.id,
        nom: matiere.nom,
        description: matiere.description,
        niveau_etude: {
          id: matiere.niveau_etude.id,
          nom: matiere.niveau_etude.nom,
          duree_mois: matiere.niveau_etude.duree_mois,
          filiere: {
            id: matiere.niveau_etude.filiere.id,
            nom: matiere.niveau_etude.filiere.nom,
            etablissement_id: matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      })) as Matiere[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findEpreuvesByNiveauEtudeAndFilters(
    etablissementId: string,
    filiereId: string,
    niveauEtudeId: string,
    titre?: string,
    type?: string,
    matiereNom?: string,
    paginationDto: PaginationDto = {}
  ): Promise<PaginationResponse<Epreuve>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Recherche des épreuves pour niveau ID: ${niveauEtudeId} - Titre: ${titre}, Type: ${type}, Matière: ${matiereNom}`);

    // Verify niveau_etude belongs to filiere and etablissement
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: {
        id: parseInt(niveauEtudeId),
        filiere: {
          id: parseInt(filiereId),
          etablissement: { id: parseInt(etablissementId) }
        }
      },
    });

    if (!niveauEtude) {
      throw new NotFoundException('Niveau d\'étude non trouvé pour cet établissement');
    }

    const whereCondition: FindOptionsWhere<Epreuve> = {
      matiere: {
        niveau_etude: { id: parseInt(niveauEtudeId) }
      }
    };

    if (titre) {
      whereCondition.titre = Like(`%${titre}%`);
    }

    if (type) {
      whereCondition.type = type as any;
    }

    if (matiereNom) {
      whereCondition.matiere = {
        ...whereCondition.matiere as any,
        nom: Like(`%${matiereNom}%`)
      };
    }

    const [epreuves, total] = await this.epreuvesRepository.findAndCount({
      where: whereCondition,
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: { date_creation: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s) pour niveau ${niveauEtudeId} sur ${total} total`);

    return {
      data: epreuves.map(epreuve => ({
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
      })) as Epreuve[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRessourcesByNiveauEtudeAndFilters(
    etablissementId: string,
    filiereId: string,
    niveauEtudeId: string,
    titre?: string,
    type?: string,
    matiereNom?: string,
    paginationDto: PaginationDto = {}
  ): Promise<PaginationResponse<Ressource>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Recherche des ressources pour niveau ID: ${niveauEtudeId} - Titre: ${titre}, Type: ${type}, Matière: ${matiereNom}`);

    // Verify niveau_etude belongs to filiere and etablissement
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: {
        id: parseInt(niveauEtudeId),
        filiere: {
          id: parseInt(filiereId),
          etablissement: { id: parseInt(etablissementId) }
        }
      },
    });

    if (!niveauEtude) {
      throw new NotFoundException('Niveau d\'étude non trouvé pour cet établissement');
    }

    const whereCondition: FindOptionsWhere<Ressource> = {
      matiere: {
        niveau_etude: { id: parseInt(niveauEtudeId) }
      }
    };

    if (titre) {
      whereCondition.titre = Like(`%${titre}%`);
    }

    if (type) {
      whereCondition.type = type as any;
    }

    if (matiereNom) {
      whereCondition.matiere = {
        ...whereCondition.matiere as any,
        nom: Like(`%${matiereNom}%`)
      };
    }

    const [ressources, total] = await this.ressourcesRepository.findAndCount({
      where: whereCondition,
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: { date_creation: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${ressources.length} ressource(s) trouvée(s) pour niveau ${niveauEtudeId} sur ${total} total`);

    return {
      data: ressources.map(ressource => ({
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
      })) as Ressource[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRessourcesByMatiereAndType(etablissementId: string, filiereId: string, niveauEtudeId: string, matiereId: string, type: string, paginationDto: PaginationDto = {}): Promise<PaginationResponse<Ressource>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Récupération des ressources pour matière ID: ${matiereId} et type: ${type} - Page: ${page}, Limite: ${limit}`);

    // Verify matiere belongs to niveau_etude, filiere, and etablissement
    const matiere = await this.matieresRepository.findOne({
      where: {
        id: parseInt(matiereId),
        niveau_etude: {
          id: parseInt(niveauEtudeId),
          filiere: {
            id: parseInt(filiereId),
            etablissement: { id: parseInt(etablissementId) }
          }
        }
      },
    });

    if (!matiere) {
      throw new NotFoundException('Matière non trouvée pour ce niveau d\'étude');
    }

    // Since we're using a string type from URL but need to match enum, we rely on controller normalization
    // Ideally we should cast to RessourceType if we were strict, but database query will handle string comparison
    const [ressources, total] = await this.ressourcesRepository.findAndCount({
      where: {
        matiere: { id: parseInt(matiereId) },
        type: type as any // Cast to any to avoid TS error if strict enum check, or RessourceType if imported
      },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: { date_creation: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${ressources.length} ressource(s) de type ${type} trouvée(s) pour matière ${matiereId} sur ${total} total`);

    return {
      data: ressources.map(ressource => ({
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
      })) as Ressource[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}