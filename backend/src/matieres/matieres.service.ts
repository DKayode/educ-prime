import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matiere } from './entities/matiere.entity';
import { CreerMatiereDto } from './dto/creer-matiere.dto';
import { MajMatiereDto } from './dto/maj-matiere.dto';

@Injectable()
export class MatieresService {
  private readonly logger = new Logger(MatieresService.name);

  constructor(
    @InjectRepository(Matiere)
    private readonly matieresRepository: Repository<Matiere>,
  ) {}

  async create(creerMatiereDto: CreerMatiereDto) {
    this.logger.log(`Création d'une matière: ${creerMatiereDto.nom}`);
    const newMatiere = new Matiere();
    newMatiere.nom = creerMatiereDto.nom;
    newMatiere.description = creerMatiereDto.description;
    newMatiere.niveau_etude_id = creerMatiereDto.niveau_etude_id;
    newMatiere.filiere_id = creerMatiereDto.filiere_id;
    const saved = await this.matieresRepository.save(newMatiere);
    this.logger.log(`Matière créée: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de toutes les matières');
    const matieres = await this.matieresRepository.find({
      relations: ['niveau_etude', 'filiere'],
    });
    this.logger.log(`${matieres.length} matière(s) trouvée(s)`);
    return matieres;
  }

  async findOne(id: string) {
    this.logger.log(`Recherche de la matière ID: ${id}`);
    const matiere = await this.matieresRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['niveau_etude', 'filiere'],
    });

    if (!matiere) {
      this.logger.warn(`Matière ID ${id} introuvable`);
      throw new NotFoundException('Matière non trouvée');
    }

    this.logger.log(`Matière trouvée: ${matiere.nom} (ID: ${id})`);
    return matiere;
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

    await this.matieresRepository.remove(matiere);
    this.logger.log(`Matière supprimée: ${matiere.nom} (ID: ${id})`);
    return { message: 'Matière supprimée avec succès' };
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