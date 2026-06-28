import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { Repository } from 'typeorm';
import { Concours } from './entities/concours.entity';
import { Structure } from '../structure/entities/structure.entity';
import { Titre } from '../titre/entities/titre.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CreateConcoursDto } from './dto/create-concours.dto';
import { UpdateConcoursDto } from './dto/update-concours.dto';
import { FilterConcoursDto } from './dto/filter-concours.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FindOptionsWhere, Like } from 'typeorm';

@Injectable()
export class ConcoursService {
  private readonly logger = new Logger(ConcoursService.name);

  constructor(
    private readonly resolver: DataSourceResolver,
    private readonly fichiersService: FichiersService,
  ) { }

  private get concoursRepository(): Repository<Concours> {
    return this.resolver.getRepository(Concours);
  }

  private get structureRepository(): Repository<Structure> {
    return this.resolver.getRepository(Structure);
  }

  private get titreRepository(): Repository<Titre> {
    return this.resolver.getRepository(Titre);
  }

  private async fetchStructureOrThrow(id: number): Promise<Structure> {
    const structure = await this.structureRepository.findOne({ where: { id } });
    if (!structure) {
      throw new NotFoundException(`Structure avec l'ID ${id} non trouvée`);
    }
    return structure;
  }

  private async fetchTitreOrThrow(id: number): Promise<Titre> {
    const titre = await this.titreRepository.findOne({ where: { id } });
    if (!titre) {
      throw new NotFoundException(`Titre avec l'ID ${id} non trouvé`);
    }
    return titre;
  }

  // Auto-composes the legacy free-text `titre` column (still read by mobile)
  // from the referenced structure + titre lookup rows. 404s if either id is
  // unknown. Format: "<structure.nom> - <titre.nom>".
  private async composeTitre(structureId: number, titreId: number): Promise<string> {
    const structure = await this.fetchStructureOrThrow(structureId);
    const titreRef = await this.fetchTitreOrThrow(titreId);
    return `${structure.nom} - ${titreRef.nom}`;
  }

  async create(createConcoursDto: CreateConcoursDto) {
    this.logger.log(`Création d'un concours (structure ${createConcoursDto.structure_id}, titre ${createConcoursDto.titre_id})`);
    const newConcours = this.concoursRepository.create(createConcoursDto);
    // structure_id + titre_id are required at create; the legacy titre column
    // is always server-composed (never the manually-typed value).
    newConcours.titre = await this.composeTitre(createConcoursDto.structure_id, createConcoursDto.titre_id);
    const saved = await this.concoursRepository.save(newConcours);
    this.logger.log(`Concours créé: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(filterDto: FilterConcoursDto): Promise<PaginationResponse<Concours>> {
    const { page = 1, limit = 10, search, annee, sort_by = 'titre', sort_order = 'ASC' } = filterDto;
    this.logger.log(`Récupération des concours - filtres: ${JSON.stringify(filterDto)}`);

    const queryBuilder = this.concoursRepository.createQueryBuilder('concours')
      .leftJoinAndSelect('concours.structure', 'structure')
      .leftJoinAndSelect('concours.titre_ref', 'titre_ref');

    if (search) {
      queryBuilder.andWhere(
        '(unaccent(concours.titre) ILIKE unaccent(:search) OR unaccent(concours.lieu) ILIKE unaccent(:search))',
        { search: `%${search}%` }
      );
    }

    if (annee) {
      queryBuilder.andWhere('concours.annee = :annee', { annee });
    }

    // Sorting
    const sortByColumn = sort_by === 'titre' ? 'concours.titre' : 'concours.annee';
    queryBuilder.orderBy(sortByColumn, 'ASC');

    // If sorting by titre, add secondary sort by date/id for stability if needed, or leave as simple sort
    if (sort_by === 'titre') {
      queryBuilder.addOrderBy('concours.annee', 'DESC');
    }

    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [concours, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`${concours.length} concours trouvé(s) sur ${total} total`);

    return {
      data: concours,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAnnees(): Promise<number[]> {
    this.logger.log('Récupération des années disponibles');
    const result = await this.concoursRepository
      .createQueryBuilder('concours')
      .select('DISTINCT concours.annee', 'annee')
      .where('concours.annee IS NOT NULL')
      .orderBy('concours.annee', 'DESC')
      .getRawMany();

    return result.map(r => r.annee);
  }

  async findOne(id: number) {
    this.logger.log(`Recherche du concours ID: ${id}`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
      relations: ['structure', 'titre_ref'],
    });

    if (!concours) {
      this.logger.warn(`Concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }

    this.logger.log(`Concours trouvé: ${concours.titre} (ID: ${id})`);
    return concours;
  }

  async findOneForDownload(id: number): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche du concours pour téléchargement - ID: ${id}`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
    });

    if (!concours) {
      this.logger.warn(`Concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }

    if (!concours.url) {
      this.logger.warn(`Concours ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Ce concours n\'a pas de fichier associé');
    }

    this.logger.log(`Concours trouvé pour téléchargement: ${concours.titre} (ID: ${id})`);

    // Increment download count
    concours.nombre_telechargements = (concours.nombre_telechargements || 0) + 1;
    await this.concoursRepository.save(concours);

    return { url: concours.url, titre: concours.titre };
  }

  async update(id: number, updateConcoursDto: UpdateConcoursDto) {
    this.logger.log(`Mise à jour du concours ID: ${id}`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
    });

    if (!concours) {
      this.logger.warn(`Mise à jour échouée: concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }

    const structureChanged = updateConcoursDto.structure_id !== undefined;
    const titreChanged = updateConcoursDto.titre_id !== undefined;

    Object.assign(concours, updateConcoursDto);

    // When either reference changes, re-validate and re-compose the legacy
    // titre column from the (effective) structure + titre rows. Composition
    // needs BOTH refs — guards a legacy row (null FKs) being partially updated.
    if (structureChanged || titreChanged) {
      if (concours.structure_id == null || concours.titre_id == null) {
        throw new BadRequestException(
          'structure_id et titre_id sont tous deux requis pour composer le titre du concours',
        );
      }
      concours.titre = await this.composeTitre(concours.structure_id, concours.titre_id);
    }

    const updated = await this.concoursRepository.save(concours);
    this.logger.log(`Concours mis à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression du concours ID: ${id}`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
    });

    if (!concours) {
      this.logger.warn(`Suppression échouée: concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }


    if (concours.url) {
      try {
        await this.fichiersService.deleteFile(concours.url);
      } catch (error) {
        this.logger.warn(`Failed to delete file for concours ${id}: ${error.message}`);
      }
    }

    await this.concoursRepository.remove(concours);
    this.logger.log(`Concours supprimé: ${concours.titre} (ID: ${id})`);
    return { message: 'Concours supprimé avec succès' };
  }
}
