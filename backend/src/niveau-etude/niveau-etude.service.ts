import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NiveauEtude } from './entities/niveau-etude.entity';
import { CreerNiveauEtudeDto } from './dto/creer-niveau-etude.dto';
import { MajNiveauEtudeDto } from './dto/maj-niveau-etude.dto';

@Injectable()
export class NiveauEtudeService {
  private readonly logger = new Logger(NiveauEtudeService.name);

  constructor(
    @InjectRepository(NiveauEtude)
    private readonly niveauEtudeRepository: Repository<NiveauEtude>,
  ) { }

  async create(creerNiveauEtudeDto: CreerNiveauEtudeDto) {
    this.logger.log(`Création d'un niveau d'étude: ${creerNiveauEtudeDto.nom} (Durée: ${creerNiveauEtudeDto.duree_mois} mois)`);
    const newNiveauEtude = new NiveauEtude();
    newNiveauEtude.nom = creerNiveauEtudeDto.nom;
    newNiveauEtude.duree_mois = creerNiveauEtudeDto.duree_mois;
    newNiveauEtude.filiere_id = creerNiveauEtudeDto.filiere_id;
    const saved = await this.niveauEtudeRepository.save(newNiveauEtude);
    this.logger.log(`Niveau d'étude créé: ${saved.nom} (ID: ${saved.id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de tous les niveaux d\'étude');
    const niveaux = await this.niveauEtudeRepository.find({
      relations: ['filiere'],
    });
    this.logger.log(`${niveaux.length} niveau(x) d'étude trouvé(s)`);

    // Transform to response DTO format
    return niveaux.map(niveau => ({
      id: niveau.id,
      nom: niveau.nom,
      duree_mois: niveau.duree_mois,
      filiere: {
        id: niveau.filiere.id,
        nom: niveau.filiere.nom,
        etablissement_id: niveau.filiere.etablissement_id,
      },
    }));
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

    await this.niveauEtudeRepository.remove(niveauEtude);
    this.logger.log(`Niveau d'étude supprimé: ${niveauEtude.nom} (ID: ${id})`);
    return { message: 'Niveau d\'étude supprimé avec succès' };
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