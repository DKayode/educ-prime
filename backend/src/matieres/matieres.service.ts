import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Matiere } from './entities/matiere.entity';
import { CreerMatiereDto } from './dto/creer-matiere.dto';
import { MajMatiereDto } from './dto/maj-matiere.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FilterMatiereDto } from './dto/filter-matiere.dto';

@Injectable()
export class MatieresService {
  private readonly logger = new Logger(MatieresService.name);

  constructor(
    @InjectRepository(Matiere)
    private readonly matieresRepository: Repository<Matiere>,
  ) { }

  async create(creerMatiereDto: CreerMatiereDto) {
    this.logger.log(`Création d'une matière: ${creerMatiereDto.nom}`);
    const newMatiere = this.matieresRepository.create(creerMatiereDto);
    const saved = await this.matieresRepository.save(newMatiere);
    this.logger.log(`Matière créée: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(filterDto: FilterMatiereDto): Promise<PaginationResponse<any>> {
    const { page = 1, limit = 10, search } = filterDto;
    this.logger.log(`Récupération des matières - Page: ${page}, Limite: ${limit}, Search: ${search}`);

    const queryBuilder = this.matieresRepository.createQueryBuilder('matiere')
      .leftJoinAndSelect('matiere.niveau_etude', 'niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('matiere.nom', filterDto.sort_order || 'ASC');

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('matiere.nom ILIKE :search', { search: `%${search}%` })
            .orWhere('niveau_etude.nom ILIKE :search', { search: `%${search}%` })
            .orWhere('filiere.nom ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (filterDto.filiere) {
      queryBuilder.andWhere('filiere.nom = :filiere', { filiere: filterDto.filiere });
    }

    const [matieres, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`${matieres.length} matière(s) trouvée(s) sur ${total} total`);

    // Transform to response DTO format
    const data = matieres.map(matiere => ({
      id: matiere.id,
      nom: matiere.nom,
      description: matiere.description,
      niveau_etude: {
        id: matiere?.niveau_etude?.id,
        nom: matiere?.niveau_etude?.nom,
        duree_mois: matiere?.niveau_etude?.duree_mois,
        filiere: {
          id: matiere?.niveau_etude?.filiere?.id,
          nom: matiere?.niveau_etude?.filiere?.nom,
          etablissement: matiere?.niveau_etude?.filiere?.etablissement,
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
    this.logger.log(`Recherche de la matière ID: ${id}`);
    const matiere = await this.matieresRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['niveau_etude', 'niveau_etude.filiere', 'niveau_etude.filiere.etablissement'],
    });

    if (!matiere) {
      this.logger.warn(`Matière ID ${id} introuvable`);
      throw new NotFoundException('Matière non trouvée');
    }

    this.logger.log(`Matière trouvée: ${matiere.nom} (ID: ${id})`);

    // Transform to response DTO format
    return {
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
    };
  }

  async update(id: string, majMatiereDto: MajMatiereDto) {
    this.logger.log(`Mise à jour de la matière ID: ${id}`);
    const matiere = await this.matieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!matiere) {
      this.logger.warn(`Mise à jour échouée: matière ID ${id} introuvable`);
      throw new NotFoundException('Matière non trouvée');
    }

    Object.assign(matiere, majMatiereDto);
    const updated = await this.matieresRepository.save(matiere);
    this.logger.log(`Matière mise à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de la matière ID: ${id}`);
    const matiere = await this.matieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!matiere) {
      this.logger.warn(`Suppression échouée: matière ID ${id} introuvable`);
      throw new NotFoundException('Matière non trouvée');
    }

    try {
      await this.matieresRepository.remove(matiere);
      this.logger.log(`Matière supprimée: ${matiere.nom} (ID: ${id})`);
      return { message: 'Matière supprimée avec succès' };
    } catch (error) {
      if (error.code === '23503') {
        throw new ConflictException('Impossible de supprimer cette matière car des épreuves, ressources ou autres contenus y sont associés. Veuillez d\'abord supprimer ces contenus.');
      }
      throw error;
    }
  }

  async findByNiveauEtude(niveauEtudeId: string) {
    this.logger.log(`Recherche des matières pour niveau d'étude ID: ${niveauEtudeId}`);
    const matieres = await this.matieresRepository.find({
      where: { niveau_etude: { id: parseInt(niveauEtudeId) } },
    });
    this.logger.log(`${matieres.length} matière(s) trouvée(s) pour niveau d'étude ${niveauEtudeId}`);
    return matieres;
  }
}