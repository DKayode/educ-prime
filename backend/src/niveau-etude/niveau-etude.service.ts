import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
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
    const { page = 1, limit = 10, nom } = filterDto;
    this.logger.log(`Récupération des niveaux d'étude - Page: ${page}, Limite: ${limit}, Nom: ${nom}`);

    const whereCondition: FindOptionsWhere<NiveauEtude> = {};

    if (nom) {
      whereCondition.nom = Like(`%${nom}%`);
    }

    const [niveaux, total] = await this.niveauEtudeRepository.findAndCount({
      where: whereCondition,
      relations: ['filiere'],
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${niveaux.length} niveau(x) d'étude trouvé(s) sur ${total} total`);

    // Transform to response DTO format
    const data = niveaux.map(niveau => ({
      id: niveau.id,
      nom: niveau.nom,
      duree_mois: niveau.duree_mois,
      filiere: {
        id: niveau.filiere.id,
        nom: niveau.filiere.nom,
        etablissement_id: niveau.filiere.etablissement_id,
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
      relations: ['filiere'],
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
        etablissement_id: niveauEtude.filiere.etablissement_id,
      },
    };
  }

  async update(id: string, majNiveauEtudeDto: MajNiveauEtudeDto) {
    this.logger.log(`Mise à jour du niveau d'étude ID: ${id}`);
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!niveauEtude) {
      this.logger.warn(`Mise à jour échouée: niveau d'étude ID ${id} introuvable`);
      throw new NotFoundException('Niveau d\'étude non trouvé');
    }

    Object.assign(niveauEtude, majNiveauEtudeDto);
    const updated = await this.niveauEtudeRepository.save(niveauEtude);
    this.logger.log(`Niveau d'étude mis à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression du niveau d'étude ID: ${id}`);
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!niveauEtude) {
      this.logger.warn(`Suppression échouée: niveau d'étude ID ${id} introuvable`);
      throw new NotFoundException('Niveau d\'étude non trouvé');
    }

    try {
      await this.niveauEtudeRepository.remove(niveauEtude);
      this.logger.log(`Niveau d'étude supprimé: ${niveauEtude.nom} (ID: ${id})`);
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
}