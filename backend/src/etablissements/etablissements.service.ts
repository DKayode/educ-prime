import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etablissement } from './entities/etablissement.entity';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';

@Injectable()
export class EtablissementsService {
  private readonly logger = new Logger(EtablissementsService.name);

  constructor(
    @InjectRepository(Etablissement)
    private readonly etablissementsRepository: Repository<Etablissement>,
  ) {}

  async create(creerEtablissementDto: CreerEtablissementDto) {
    this.logger.log(`Création d'un établissement: ${creerEtablissementDto.nom}`);
    const newEtablissement = this.etablissementsRepository.create(creerEtablissementDto);
    const saved = await this.etablissementsRepository.save(newEtablissement);
    this.logger.log(`Établissement créé: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de tous les établissements');
    const etablissements = await this.etablissementsRepository.find();
    this.logger.log(`${etablissements.length} établissement(s) trouvé(s)`);
    return etablissements;
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

    await this.etablissementsRepository.remove(etablissement);
    this.logger.log(`Établissement supprimé: ${etablissement.nom} (ID: ${id})`);
    return { message: 'Établissement supprimé avec succès' };
  }
}