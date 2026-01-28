import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Brackets } from 'typeorm';
import { NiveauEtude } from './entities/niveau-etude.entity';
import { CreerNiveauEtudeDto } from './dto/creer-niveau-etude.dto';
import { MajNiveauEtudeDto } from './dto/maj-niveau-etude.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FilterNiveauEtudeDto } from './dto/filter-niveau-etude.dto';

@Injectable()
export class NiveauEtudeService {
  private readonly logger = new Logger(NiveauEtudeService.name);

  constructor(
    @InjectRepository(NiveauEtude)
    private readonly niveauEtudeRepository: Repository<NiveauEtude>,
  ) { }

  async create(creerNiveauEtudeDto: CreerNiveauEtudeDto) {
    this.logger.log(`Création d'un niveau d'étude: ${creerNiveauEtudeDto.nom} (Durée: ${creerNiveauEtudeDto.duree_mois} mois)`);
    const newNiveauEtude = this.niveauEtudeRepository.create(creerNiveauEtudeDto);
    const saved = await this.niveauEtudeRepository.save(newNiveauEtude);
    this.logger.log(`Niveau d'étude créé: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(filterDto: FilterNiveauEtudeDto): Promise<PaginationResponse<any>> {
    const { page = 1, limit = 10, search, filiere } = filterDto;
    this.logger.log(`Récupération des niveaux d'étude - Page: ${page}, Limite: ${limit}, Search: ${search}, Filière: ${filiere}`);

    const queryBuilder = this.niveauEtudeRepository.createQueryBuilder('niveau')
      .leftJoinAndSelect('niveau.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('niveau.nom', filterDto.sort_order || 'ASC')

    if (filiere) {
      queryBuilder.andWhere('filiere.nom = :filiere', { filiere });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(niveau.nom) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(filiere.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
        }),
      );
    }

    const [niveaux, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`${niveaux.length} niveau(x) d'étude trouvé(s) sur ${total} total`);

    // Transform to response DTO format
    const data = niveaux.map(niveau => ({
      id: niveau.id,
      nom: niveau.nom,
      duree_mois: niveau.duree_mois,
      filiere: {
        id: niveau.filiere.id,
        nom: niveau.filiere.nom,
        etablissement: niveau.filiere.etablissement,
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
    this.logger.log(`Recherche du niveau d'étude ID: ${id}`);
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['filiere', 'filiere.etablissement'],
    });

    if (!niveauEtude) {
      this.logger.warn(`Niveau d'étude ID ${id} introuvable`);
      throw new NotFoundException('Niveau d\'étude non trouvé');
    }

    this.logger.log(`Niveau d'étude trouvé: ${niveauEtude.nom} (ID: ${id})`);

    // Transform to response DTO format
    return {
      id: niveauEtude.id,
      nom: niveauEtude.nom,
      duree_mois: niveauEtude.duree_mois,
      filiere: {
        id: niveauEtude.filiere.id,
        nom: niveauEtude.filiere.nom,
        etablissement: niveauEtude.filiere.etablissement,
      },
    };
  }

  async update(id: string, majNiveauEtudeDto: MajNiveauEtudeDto) {
    this.logger.log(`Mise à jour du niveau d'étude ID: ${id}`);
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!niveauEtude) {
      this.logger.warn(`Niveau d'étude ID ${id} introuvable pour mise à jour`);
      throw new NotFoundException('Niveau d\'étude non trouvé');
    }

    // Si on met à jour la filière
    let filiere = niveauEtude.filiere;
    if (majNiveauEtudeDto.filiere_id) {
      filiere = { id: majNiveauEtudeDto.filiere_id } as any;
    }

    const updated = await this.niveauEtudeRepository.save({
      ...niveauEtude,
      ...majNiveauEtudeDto,
      filiere,
    });

    this.logger.log(`Niveau d'étude mis à jour: ${updated.nom}`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression du niveau d'étude ID: ${id}`);
    try {
      const result = await this.niveauEtudeRepository.delete(id);
      if (result.affected === 0) {
        this.logger.warn(`Niveau d'étude ID ${id} introuvable pour suppression`);
        throw new NotFoundException('Niveau d\'étude non trouvé');
      }
      this.logger.log(`Niveau d'étude supprimé`);
      return { message: 'Niveau d\'étude supprimé avec succès' };
    } catch (error) {
      if (error.code === '23503') {
        throw new ConflictException('Impossible de supprimer ce niveau d\'étude car des matières y sont associées. Veuillez d\'abord supprimer les matières.');
      }
      throw error;
    }
  }
  async findByFiliere(filiereId: string) {
    this.logger.log(`Recherche des niveaux d'étude pour filière ID: ${filiereId}`);
    const niveaux = await this.niveauEtudeRepository.find({
      where: { filiere: { id: parseInt(filiereId) } },
    });
    this.logger.log(`${niveaux.length} niveau(x) d'étude trouvé(s) pour filière ${filiereId}`);
    return niveaux;
  }
  async findGroupByName(paginationDto: PaginationDto): Promise<PaginationResponse<any>> {
    const { page = 1, limit = 10, search } = paginationDto;
    this.logger.log(`Récupération des niveaux groupés par nom (Page: ${page}, Limit: ${limit}, Search: ${search})`);

    // 1. Compter le total des noms distincts
    const countQuery = this.niveauEtudeRepository.createQueryBuilder('niveau')
      .select('COUNT(DISTINCT(niveau.nom))', 'count');

    if (search) {
      countQuery.where('unaccent(niveau.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
    }

    const countResult = await countQuery.getRawOne();
    const total = parseInt(countResult.count, 10);

    // 2. Récupérer les noms de la page courante
    const namesQuery = this.niveauEtudeRepository.createQueryBuilder('niveau')
      .select('DISTINCT(niveau.nom)', 'nom')
      .orderBy('nom', 'ASC') // Sorting by alias 'nom'
      .limit(limit)
      .offset((page - 1) * limit);

    if (search) {
      namesQuery.where('unaccent(niveau.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
    }

    const rawNames = await namesQuery.getRawMany();
    const names = rawNames.map(r => r.nom);

    if (names.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }

    // 3. Récupérer les données complètes pour ces noms

    const details = await this.niveauEtudeRepository.createQueryBuilder('niveau')
      .leftJoinAndSelect('niveau.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .where("niveau.nom IN (:...names)", { names })
      .orderBy('niveau.nom', 'ASC')
      .getMany();


    const grouped = new Map<string, any[]>();

    // Initialize groups for all fetched names to ensure empty ones (unlikely) or order preservation
    names.forEach(name => grouped.set(name, []));

    details.forEach(niveau => {
      const existing = grouped.get(niveau.nom);
      if (existing) {
        existing.push({
          ...niveau.filiere,
          niveau_id: niveau.id,
          duree_mois: niveau.duree_mois
        });
      }
    });

    const data = Array.from(grouped.entries()).map(([nom, filieres]) => ({
      nom,
      filieres
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async removeGroup(nom: string) {
    this.logger.log(`Suppression du groupe de niveaux: ${nom}`);
    const niveaux = await this.niveauEtudeRepository.find({ where: { nom } });
    if (niveaux.length === 0) {
      throw new NotFoundException('Groupe introuvable');
    }

    try {
      await this.niveauEtudeRepository.delete({ nom });
      this.logger.log(`Groupe de niveaux ${nom} supprimé`);
      return { message: `Groupe ${nom} supprimé avec succès` };
    } catch (error) {
      if (error.code === '23503') {
        throw new ConflictException('Impossible de supprimer certains niveaux de ce groupe car des matières y sont associées. Veuillez d\'abord supprimer les matières.');
      }
      throw error;
    }
  }
}