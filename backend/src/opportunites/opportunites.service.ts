import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunite } from './entities/opportunite.entity';
import { CreerOpportuniteDto } from './dto/create-opportunite.dto';
import { UpdateOpportuniteDto } from './dto/update-opportunite.dto';

@Injectable()
export class OpportunitesService {
  private readonly logger = new Logger(OpportunitesService.name);

  constructor(
    @InjectRepository(Opportunite)
    private readonly opportuniteRepository: Repository<Opportunite>,
  ) { }

  async create(creerOpportuniteDto: CreerOpportuniteDto) {
    this.logger.log(`Création d'une opportunité: ${creerOpportuniteDto.titre}`);
    const newOpportunite = this.opportuniteRepository.create(creerOpportuniteDto);
    const saved = await this.opportuniteRepository.save(newOpportunite);
    this.logger.log(`Opportunité créée: ${saved.titre} (ID: ${saved.id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de toutes les opportunités');
    const opportunites = await this.opportuniteRepository.find({
      order: { date_limite: 'ASC', date_creation: 'DESC' },
    });
    this.logger.log(`${opportunites.length} opportunité(s) trouvée(s)`);
    return opportunites;
  }

  async findOne(id: number) {
    this.logger.log(`Recherche de l'opportunité ID: ${id}`);
    const opportunite = await this.opportuniteRepository.findOne({
      where: { id },
    });

    if (!opportunite) {
      this.logger.warn(`Opportunité ID ${id} introuvable`);
      throw new NotFoundException('Opportunité non trouvée');
    }

    this.logger.log(`Opportunité trouvée: ${opportunite.titre} (ID: ${id})`);
    return opportunite;
  }

  async update(id: number, updateOpportuniteDto: UpdateOpportuniteDto) {
    this.logger.log(`Mise à jour de l'opportunité ID: ${id}`);
    const opportunite = await this.opportuniteRepository.findOne({
      where: { id },
    });

    if (!opportunite) {
      this.logger.warn(`Mise à jour échouée: opportunité ID ${id} introuvable`);
      throw new NotFoundException('Opportunité non trouvée');
    }

    Object.assign(opportunite, updateOpportuniteDto);
    const updated = await this.opportuniteRepository.save(opportunite);
    this.logger.log(`Opportunité mise à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression de l'opportunité ID: ${id}`);
    const opportunite = await this.opportuniteRepository.findOne({
      where: { id },
    });

    if (!opportunite) {
      this.logger.warn(`Suppression échouée: opportunité ID ${id} introuvable`);
      throw new NotFoundException('Opportunité non trouvée');
    }

    await this.opportuniteRepository.remove(opportunite);
    this.logger.log(`Opportunité supprimée: ${opportunite.titre} (ID: ${id})`);
    return { message: 'Opportunité supprimée avec succès' };
  }
}
