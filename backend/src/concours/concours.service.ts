import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Concours } from './entities/concours.entity';
import { CreateConcoursDto } from './dto/create-concours.dto';
import { UpdateConcoursDto } from './dto/update-concours.dto';
import { FilterConcoursDto } from './dto/filter-concours.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { FindOptionsWhere, Like } from 'typeorm';

@Injectable()
export class ConcoursService {
  private readonly logger = new Logger(ConcoursService.name);

  constructor(
    @InjectRepository(Concours)
    private readonly concoursRepository: Repository<Concours>,
    private readonly fichiersService: FichiersService,
  ) { }

  async create(createConcoursDto: CreateConcoursDto) {
    this.logger.log(`Création d'un concours: ${createConcoursDto.titre}`);
    const newConcours = this.concoursRepository.create(createConcoursDto);
    const saved = await this.concoursRepository.save(newConcours);
    this.logger.log(`Concours créé: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(filterDto: FilterConcoursDto): Promise<PaginationResponse<Concours>> {
    const { page = 1, limit = 10, titre, lieu, annee } = filterDto;
    this.logger.log(`Récupération des concours - filtres: ${JSON.stringify(filterDto)}`);

    const where: FindOptionsWhere<Concours> = {};
    if (titre) where.titre = Like(`%${titre}%`);
    if (lieu) where.lieu = Like(`%${lieu}%`);
    if (annee) where.annee = annee;

    const [concours, total] = await this.concoursRepository.findAndCount({
      where,
      order: { annee: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

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

    Object.assign(concours, updateConcoursDto);
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
