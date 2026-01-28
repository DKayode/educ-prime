import { Injectable, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Brackets, Raw } from 'typeorm';
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
import { FilterMatiereDto } from '../matieres/dto/filter-matiere.dto';
import { FilterEpreuveDto } from '../epreuves/dto/filter-epreuve.dto';
import { FilterRessourceDto } from '../ressources/dto/filter-ressource.dto';
import { FiliereResponseDto } from '../filieres/dto/filiere-response.dto';
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
    const { page = 1, limit = 10, search } = filterDto;
    this.logger.log(`Récupération des établissements - Page: ${page}, Limite: ${limit}, Search: ${search}`);

    const queryBuilder = this.etablissementsRepository.createQueryBuilder('etablissement');

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(etablissement.nom) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(etablissement.ville) ILIKE unaccent(:search)', { search: `%${search}%` });
        }),
      );
    }

    const [etablissements, total] = await queryBuilder
      .orderBy('etablissement.nom', filterDto.sort_order || 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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
  async findFilieresById(id: string, filterDto: FilterFiliereDto): Promise<PaginationResponse<FiliereResponseDto>> {
    const { page = 1, limit = 10, search } = filterDto;
    this.logger.log(`Récupération des filières pour établissement ID: ${id} - Page: ${page}, Limite: ${limit}, Search: ${search}`);
    await this.findOne(id); // Verify etablissement exists

    const whereCondition: FindOptionsWhere<Filiere> = {
      etablissement: { id: parseInt(id) },
    };

    if (search) {
      whereCondition.nom = Raw(alias => `unaccent(${alias}) ILIKE unaccent('%${search}%')`);
    }

    const [filieres, total] = await this.filieresRepository.findAndCount({
      where: whereCondition,
      relations: ['etablissement'],
      order: { nom: filterDto.sort_order || 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${filieres.length} filière(s) trouvée(s) pour établissement ${id} sur ${total} total`);

    return {
      data: filieres.map(filiere => ({
        id: filiere.id,
        nom: filiere.nom,
        etablissement: filiere.etablissement,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNiveauEtudeByFiliere(etablissementId: string, filiereId: string, filterDto: FilterNiveauEtudeDto): Promise<PaginationResponse<NiveauEtude>> {
    const { page = 1, limit = 10, search } = filterDto;
    this.logger.log(`Récupération des niveaux d'étude pour filière ID: ${filiereId} - Page: ${page}, Limite: ${limit}, Search: ${search}`);

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

    if (search) {
      whereCondition.nom = Raw(alias => `unaccent(${alias}) ILIKE unaccent('%${search}%')`);
    }

    const [niveaux, total] = await this.niveauEtudeRepository.findAndCount({
      where: whereCondition,
      relations: ['filiere', 'filiere.etablissement'],
      order: { nom: filterDto.sort_order || 'ASC' },
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
          etablissement: niveau.filiere.etablissement,
        },
      })) as NiveauEtude[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findMatieresByNiveauEtude(etablissementId: string, filiereId: string, niveauEtudeId: string, filterDto: FilterMatiereDto): Promise<PaginationResponse<Matiere>> {
    const { page = 1, limit = 10, search } = filterDto;
    this.logger.log(`Récupération des matières pour niveau d'étude ID: ${niveauEtudeId} - Page: ${page}, Limite: ${limit}, Search: ${search}`);

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

    const queryBuilder = this.matieresRepository.createQueryBuilder('matiere')
      .leftJoinAndSelect('matiere.niveau_etude', 'niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .where('niveau_etude.id = :niveauEtudeId', { niveauEtudeId });

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(matiere.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
        }),
      );
    }

    const [matieres, total] = await queryBuilder
      .orderBy('matiere.nom', filterDto.sort_order || 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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
            etablissement: matiere.niveau_etude.filiere.etablissement,
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
    filterDto: FilterEpreuveDto
  ): Promise<PaginationResponse<Epreuve>> {
    const { page = 1, limit = 10, search, type, matiere } = filterDto;
    this.logger.log(`Recherche des épreuves pour niveau ID: ${niveauEtudeId} - Search: ${search}, Type: ${type}, Matière: ${matiere}`);

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

    const queryBuilder = this.epreuvesRepository.createQueryBuilder('epreuve')
      .leftJoinAndSelect('epreuve.matiere', 'matiere')
      .leftJoinAndSelect('matiere.niveau_etude', 'niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .leftJoinAndSelect('epreuve.professeur', 'professeur')
      .where('niveau_etude.id = :niveauEtudeId', { niveauEtudeId })
      .orderBy('epreuve.date_creation', filterDto.sort_order || 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('epreuve.type = :type', { type });
    }

    if (matiere) {
      queryBuilder.andWhere('matiere.nom = :matiere', { matiere });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(epreuve.titre) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(matiere.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
        }),
      );
    }

    const [epreuves, total] = await queryBuilder.getManyAndCount();

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
              etablissement: epreuve.matiere.niveau_etude.filiere.etablissement,
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
    filterDto: FilterRessourceDto
  ): Promise<PaginationResponse<Ressource>> {
    const { page = 1, limit = 10, search, type, matiere } = filterDto;
    this.logger.log(`Recherche des ressources pour niveau ID: ${niveauEtudeId} - Search: ${search}, Type: ${type}, Matière: ${matiere}`);

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

    const queryBuilder = this.ressourcesRepository.createQueryBuilder('ressource')
      .leftJoinAndSelect('ressource.matiere', 'matiere')
      .leftJoinAndSelect('matiere.niveau_etude', 'niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .leftJoinAndSelect('ressource.professeur', 'professeur')
      .where('niveau_etude.id = :niveauEtudeId', { niveauEtudeId })
      .orderBy('ressource.date_creation', filterDto.sort_order || 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('ressource.type = :type', { type });
    }

    if (matiere) {
      queryBuilder.andWhere('matiere.nom = :matiere', { matiere });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(ressource.titre) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(matiere.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
        }),
      );
    }

    const [ressources, total] = await queryBuilder.getManyAndCount();

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
              etablissement: ressource.matiere.niveau_etude.filiere.etablissement,
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