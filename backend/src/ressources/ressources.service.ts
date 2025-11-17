import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ressource, RessourceType } from './entities/ressource.entity';
import { CreerRessourceDto } from './dto/creer-ressource.dto';
import { MajRessourceDto } from './dto/maj-ressource.dto';

@Injectable()
export class RessourcesService {
  private readonly logger = new Logger(RessourcesService.name);

  constructor(
    @InjectRepository(Ressource)
    private readonly ressourcesRepository: Repository<Ressource>,
  ) {}

  async create(creerRessourceDto: CreerRessourceDto, professeurId: number) {
    this.logger.log(`Création d'une ressource: ${creerRessourceDto.titre} (Type: ${creerRessourceDto.type}) par professeur ID: ${professeurId}`);
    const newRessource = new Ressource();
    newRessource.titre = creerRessourceDto.titre;
    newRessource.type = creerRessourceDto.type;
    newRessource.url = creerRessourceDto.url;
    newRessource.matiere_id = creerRessourceDto.matiere_id;
    newRessource.professeur_id = professeurId;
    newRessource.date_publication = creerRessourceDto.date_publication;
    const saved = await this.ressourcesRepository.save(newRessource);
    this.logger.log(`Ressource créée: ${saved.titre} (ID: ${saved.id}, Type: ${saved.type})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de toutes les ressources');
    const ressources = await this.ressourcesRepository.find({
      relations: ['matiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
    this.logger.log(`${ressources.length} ressource(s) trouvée(s)`);
    return ressources;
  }

  async findOne(id: string) {
    this.logger.log(`Recherche de la ressource ID: ${id}`);
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['matiere', 'professeur'],
    });

    if (!ressource) {
      this.logger.warn(`Ressource ID ${id} introuvable`);
      throw new NotFoundException('Ressource non trouvée');
    }

    this.logger.log(`Ressource trouvée: ${ressource.titre} (ID: ${id}, Type: ${ressource.type})`);
    return ressource;
  }

  async update(id: string, majRessourceDto: MajRessourceDto) {
    this.logger.log(`Mise à jour de la ressource ID: ${id}`);
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['professeur'],
    });

    if (!ressource) {
      this.logger.warn(`Mise à jour échouée: ressource ID ${id} introuvable`);
      throw new NotFoundException('Ressource non trouvée');
    }

    Object.assign(ressource, majRessourceDto);
    const updated = await this.ressourcesRepository.save(ressource);
    this.logger.log(`Ressource mise à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de la ressource ID: ${id}`);
    const ressource = await this.ressourcesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!ressource) {
      this.logger.warn(`Suppression échouée: ressource ID ${id} introuvable`);
      throw new NotFoundException('Ressource non trouvée');
    }

    await this.ressourcesRepository.remove(ressource);
    this.logger.log(`Ressource supprimée: ${ressource.titre} (ID: ${id})`);
    return { message: 'Ressource supprimée avec succès' };
  }

  async findByMatiere(matiereId: string) {
    this.logger.log(`Recherche des ressources pour matière ID: ${matiereId}`);
    const ressources = await this.ressourcesRepository.find({
      where: { matiere: { id: parseInt(matiereId) } },
      relations: ['professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
    this.logger.log(`${ressources.length} ressource(s) trouvée(s) pour matière ${matiereId}`);
    return ressources;
  }

  async findByProfesseur(professeurId: string) {
    this.logger.log(`Recherche des ressources du professeur ID: ${professeurId}`);
    const ressources = await this.ressourcesRepository.find({
      where: { professeur: { id: parseInt(professeurId) } },
      relations: ['matiere'],
      order: {
        date_creation: 'DESC',
      },
    });
    this.logger.log(`${ressources.length} ressource(s) trouvée(s) pour professeur ${professeurId}`);
    return ressources;
  }

  async findByType(type: string) {
    this.logger.log(`Recherche des ressources de type: ${type}`);
    const ressources = await this.ressourcesRepository.find({
      where: { type: type as RessourceType },
      relations: ['matiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
    this.logger.log(`${ressources.length} ressource(s) de type ${type} trouvée(s)`);
    return ressources;
  }
}