import { Injectable, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Brackets, Raw } from 'typeorm';
import { Etablissement } from './entities/etablissement.entity';
import { Filiere } from '../filieres/entities/filiere.entity';
import { NiveauEtude } from '../niveau-etude/entities/niveau-etude.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FilterEtablissementDto } from './dto/filter-etablissement.dto';
import { FilterFiliereDto } from '../filieres/dto/filter-filiere.dto';
import { FilterNiveauEtudeDto } from '../niveau-etude/dto/filter-niveau-etude.dto';
import { FilterMatiereDto } from '../matieres/dto/filter-matiere.dto';
import { FilterEpreuveDto } from '../epreuves/dto/filter-epreuve.dto';
import { FiliereResponseDto } from '../filieres/dto/filiere-response.dto';
import { FichiersService } from '../fichiers/fichiers.service';
import { professeurPublic } from '../epreuves/professeur-public.util';

// Countries whose academic hierarchy is always returned in full, regardless of
// the `all` query flag. The default lists hide établissements / filières /
// niveaux that have no épreuve yet; for a new market like Sénégal (no épreuves
// on the platform yet) that would leave the whole catalogue empty, so we always
// surface everything for these countries.
const SHOW_ALL_RESOURCES_COUNTRIES = new Set(['senegal']);

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
    private readonly fichiersService: FichiersService,
  ) { }

  async create(pays: string, creerEtablissementDto: CreerEtablissementDto) {
    this.logger.log(`Création d'un établissement (pays=${pays}): ${creerEtablissementDto.nom}`);
    const newEtablissement = this.etablissementsRepository.create({ ...creerEtablissementDto, pays });
    const saved = await this.etablissementsRepository.save(newEtablissement);
    this.logger.log(`Établissement créé: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(pays: string, filterDto: FilterEtablissementDto): Promise<PaginationResponse<Etablissement>> {
    const { page = 1, limit = 10, search, all } = filterDto;
    this.logger.log(`Récupération des établissements (pays=${pays}) - Page: ${page}, Limite: ${limit}, Search: ${search}, All: ${all}`);

    const queryBuilder = this.etablissementsRepository.createQueryBuilder('etablissement')
      .where('etablissement.pays = :pays', { pays });

    // Default: only établissements that have at least one épreuve reachable
    // through the chain épreuve→matière→niveau→filière→établissement, so the
    // mobile list never surfaces empty établissements. all=true lifts the
    // filter (admin management / parent pickers need every établissement).
    const showAll = all || SHOW_ALL_RESOURCES_COUNTRIES.has(pays);
    if (!showAll) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM epreuves ep
          INNER JOIN matieres m ON m.id = ep.matiere_id
          INNER JOIN niveau_etude n ON n.id = m.niveau_etude_id
          INNER JOIN filieres f ON f.id = n.filiere_id
          WHERE f.etablissement_id = etablissement.id
        )`,
      );
    }

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
  async findFilieresById(pays: string, id: string, filterDto: FilterFiliereDto): Promise<PaginationResponse<FiliereResponseDto>> {
    const { page = 1, limit = 10, search, all } = filterDto;
    this.logger.log(`Récupération des filières (pays=${pays}) pour établissement ID: ${id} - Page: ${page}, Limite: ${limit}, Search: ${search}, All: ${all}`);
    await this.findOne(id); // Verify etablissement exists

    const queryBuilder = this.filieresRepository.createQueryBuilder('filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .where('filiere.pays = :pays', { pays })
      .andWhere('etablissement.id = :etabId', { etabId: parseInt(id) });

    // Default: only filières with at least one épreuve reachable through
    // filière→niveau→matière→épreuve. all=true lifts the filter.
    const showAll = all || SHOW_ALL_RESOURCES_COUNTRIES.has(pays);
    if (!showAll) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM epreuves ep
          INNER JOIN matieres m ON m.id = ep.matiere_id
          INNER JOIN niveau_etude n ON n.id = m.niveau_etude_id
          WHERE n.filiere_id = filiere.id
        )`,
      );
    }

    if (search) {
      queryBuilder.andWhere('unaccent(filiere.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
    }

    const [filieres, total] = await queryBuilder
      .orderBy('filiere.nom', filterDto.sort_order || 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  async findNiveauEtudeByFiliere(pays: string, etablissementId: string, filiereId: string, filterDto: FilterNiveauEtudeDto): Promise<PaginationResponse<NiveauEtude>> {
    const { page = 1, limit = 10, search, all } = filterDto;
    this.logger.log(`Récupération des niveaux d'étude (pays=${pays}) pour filière ID: ${filiereId} - Page: ${page}, Limite: ${limit}, Search: ${search}, All: ${all}`);

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

    const queryBuilder = this.niveauEtudeRepository.createQueryBuilder('niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .where('niveau_etude.pays = :pays', { pays })
      .andWhere('filiere.id = :filiereId', { filiereId: parseInt(filiereId) });

    // Default: only niveaux with at least one épreuve reachable through
    // niveau→matière→épreuve. all=true lifts the filter.
    const showAll = all || SHOW_ALL_RESOURCES_COUNTRIES.has(pays);
    if (!showAll) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1 FROM epreuves ep
          INNER JOIN matieres m ON m.id = ep.matiere_id
          WHERE m.niveau_etude_id = niveau_etude.id
        )`,
      );
    }

    if (search) {
      queryBuilder.andWhere('unaccent(niveau_etude.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
    }

    const [niveaux, total] = await queryBuilder
      .orderBy('niveau_etude.nom', filterDto.sort_order || 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  async findMatieresByNiveauEtude(pays: string, etablissementId: string, filiereId: string, niveauEtudeId: string, filterDto: FilterMatiereDto): Promise<PaginationResponse<Matiere>> {
    const { page = 1, limit = 10, search } = filterDto;
    this.logger.log(`Récupération des matières (pays=${pays}) pour niveau d'étude ID: ${niveauEtudeId} - Page: ${page}, Limite: ${limit}, Search: ${search}`);

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
      .where('matiere.pays = :pays', { pays })
      .andWhere('niveau_etude.id = :niveauEtudeId', { niveauEtudeId });

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
    pays: string,
    etablissementId: string,
    filiereId: string,
    niveauEtudeId: string,
    filterDto: FilterEpreuveDto
  ): Promise<PaginationResponse<Epreuve>> {
    const { page = 1, limit = 10, search, type, matiere } = filterDto;
    this.logger.log(`Recherche des épreuves (pays=${pays}) pour niveau ID: ${niveauEtudeId} - Search: ${search}, Type: ${type}, Matière: ${matiere}`);

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
      .where('epreuve.pays = :pays', { pays })
      .andWhere('niveau_etude.id = :niveauEtudeId', { niveauEtudeId })
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
        uuid: epreuve.uuid,
        titre: epreuve.titre,
        url: epreuve.url,
        duree_minutes: epreuve.duree_minutes,
        date_creation: epreuve.date_creation,
        date_publication: epreuve.date_publication,
        nombre_pages: epreuve.nombre_pages,
        nombre_telechargements: epreuve.nombre_telechargements,
        type: epreuve.type,
        professeur: professeurPublic(epreuve.professeur),
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
}