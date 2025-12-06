import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evenement } from './entities/evenement.entity';
import { CreerEvenementDto } from './dto/create-evenement.dto';
import { UpdateEvenementDto } from './dto/update-evenement.dto';

@Injectable()
export class EvenementsService {
  private readonly logger = new Logger(EvenementsService.name);

  constructor(
    @InjectRepository(Evenement)
    private readonly evenementRepository: Repository<Evenement>,
  ) { }

  async create(creerEvenementDto: CreerEvenementDto) {
    this.logger.log(`Création d'un événement: ${creerEvenementDto.titre}`);
    const newEvenement = this.evenementRepository.create(creerEvenementDto);
    const saved = await this.evenementRepository.save(newEvenement);
    this.logger.log(`Événement créé: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de tous les événements');
    const evenements = await this.evenementRepository.find({
      order: { date_heure: 'DESC', date_creation: 'DESC' },
    });
    this.logger.log(`${evenements.length} événement(s) trouvé(s)`);
    return evenements;
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

    await this.evenementRepository.remove(evenement);
    this.logger.log(`Événement supprimé: ${evenement.titre} (ID: ${id})`);
    return { message: 'Événement supprimé avec succès' };
  }
}
