import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filiere } from './entities/filiere.entity';
import { CreerFiliereDto } from './dto/creer-filiere.dto';
import { MajFiliereDto } from './dto/maj-filiere.dto';

@Injectable()
export class FilieresService {
  private readonly logger = new Logger(FilieresService.name);

  constructor(
    @InjectRepository(Filiere)
    private readonly filieresRepository: Repository<Filiere>,
  ) {}

  async create(creerFiliereDto: CreerFiliereDto) {
    this.logger.log(`Création d'une filière: ${creerFiliereDto.nom} (Établissement ID: ${creerFiliereDto.etablissement_id})`);
    const newFiliere = this.filieresRepository.create({
      nom: creerFiliereDto.nom,
      etablissement: { id: creerFiliereDto.etablissement_id } as any,
    });
    const saved = await this.filieresRepository.save(newFiliere);
    this.logger.log(`Filière créée: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de toutes les filières');
    const filieres = await this.filieresRepository.find({
      relations: ['etablissement'],
    });
    this.logger.log(`${filieres.length} filière(s) trouvée(s)`);
    return filieres;
  }

  async findOne(id: string) {
    this.logger.log(`Recherche de la filière ID: ${id}`);
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['etablissement'],
    });

    if (!filiere) {
      this.logger.warn(`Filière ID ${id} introuvable`);
      throw new NotFoundException('Filière non trouvée');
    }

    this.logger.log(`Filière trouvée: ${filiere.nom} (ID: ${id})`);
    return filiere;
  }

  async update(id: string, majFiliereDto: MajFiliereDto) {
    this.logger.log(`Mise à jour de la filière ID: ${id}`);
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!filiere) {
      this.logger.warn(`Mise à jour échouée: filière ID ${id} introuvable`);
      throw new NotFoundException('Filière non trouvée');
    }

    if (majFiliereDto.nom) {
      filiere.nom = majFiliereDto.nom;
    }

    if (majFiliereDto.etablissement_id) {
      filiere.etablissement = { id: majFiliereDto.etablissement_id } as any;
    }

    const updated = await this.filieresRepository.save(filiere);
    this.logger.log(`Filière mise à jour: ${updated.nom} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de la filière ID: ${id}`);
    const filiere = await this.filieresRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!filiere) {
      this.logger.warn(`Suppression échouée: filière ID ${id} introuvable`);
      throw new NotFoundException('Filière non trouvée');
    }

    await this.filieresRepository.remove(filiere);
    this.logger.log(`Filière supprimée: ${filiere.nom} (ID: ${id})`);
    return { message: 'Filière supprimée avec succès' };
  }

  async findByEtablissement(etablissementId: string) {
    this.logger.log(`Recherche des filières pour établissement ID: ${etablissementId}`);
    const filieres = await this.filieresRepository.find({
      where: { etablissement: { id: parseInt(etablissementId) } },
    });
    this.logger.log(`${filieres.length} filière(s) trouvée(s) pour établissement ${etablissementId}`);
    return filieres;
  }
}