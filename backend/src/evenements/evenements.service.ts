import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evenement } from './entities/evenement.entity';
import { CreerEvenementDto } from './dto/create-evenement.dto';
import { UpdateEvenementDto } from './dto/update-evenement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class EvenementsService {
  private readonly logger = new Logger(EvenementsService.name);

  constructor(
    @InjectRepository(Evenement)
    private readonly evenementRepository: Repository<Evenement>,
    private readonly fichiersService: FichiersService,
  ) { }

  async create(creerEvenementDto: CreerEvenementDto) {
    this.logger.log(`Création d'un événement: ${creerEvenementDto.titre}`);
    const newEvenement = this.evenementRepository.create(creerEvenementDto);
    const saved = await this.evenementRepository.save(newEvenement);
    this.logger.log(`Événement créé: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<Evenement>> {
    const { page = 1, limit = 10 } = paginationDto;
    this.logger.log(`Récupération des événements - Page: ${page}, Limite: ${limit}`);

    const [evenements, total] = await this.evenementRepository.findAndCount({
      order: { date: 'DESC', date_creation: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`${evenements.length} événement(s) trouvé(s) sur ${total} total`);

    return {
      data: evenements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    this.logger.log(`Recherche de l'événement ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }

    this.logger.log(`Événement trouvé: ${evenement.titre} (ID: ${id})`);
    return evenement;
  }

  async findOneForDownload(id: number): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche de l'événement pour téléchargement - ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }

    if (!evenement.image) {
      this.logger.warn(`Événement ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Cet événement n\'a pas de fichier associé');
    }

    this.logger.log(`Événement trouvé pour téléchargement: ${evenement.titre} (ID: ${id})`);
    return { url: evenement.image, titre: evenement.titre };
  }

  async update(id: number, updateEvenementDto: UpdateEvenementDto) {
    this.logger.log(`Mise à jour de l'événement ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Mise à jour échouée: événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }

    Object.assign(evenement, updateEvenementDto);
    const updated = await this.evenementRepository.save(evenement);
    this.logger.log(`Événement mis à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression de l'événement ID: ${id}`);
    const evenement = await this.evenementRepository.findOne({
      where: { id },
    });

    if (!evenement) {
      this.logger.warn(`Suppression échouée: événement ID ${id} introuvable`);
      throw new NotFoundException('Événement non trouvé');
    }


    if (evenement.image) {
      try {
        await this.fichiersService.deleteFile(evenement.image);
      } catch (error) {
        this.logger.warn(`Failed to delete file for evenement ${id}: ${error.message}`);
      }
    }

    await this.evenementRepository.remove(evenement);
    this.logger.log(`Événement supprimé: ${evenement.titre} (ID: ${id})`);
    return { message: 'Événement supprimé avec succès' };
  }
}
