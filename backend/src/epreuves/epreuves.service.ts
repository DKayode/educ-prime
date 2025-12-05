import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Epreuve } from './entities/epreuve.entity';
import { CreerEpreuveDto } from './dto/creer-epreuve.dto';
import { MajEpreuveDto } from './dto/maj-epreuve.dto';

@Injectable()
export class EpreuvesService {
  private readonly logger = new Logger(EpreuvesService.name);

  constructor(
    @InjectRepository(Epreuve)
    private readonly epreuvesRepository: Repository<Epreuve>,
  ) { }

  async create(creerEpreuveDto: CreerEpreuveDto, professeurId: number) {
    this.logger.log(`Création d'une épreuve: ${creerEpreuveDto.titre} par professeur ID: ${professeurId}`);
    const newEpreuve = new Epreuve();
    newEpreuve.titre = creerEpreuveDto.titre;
    newEpreuve.url = creerEpreuveDto.url;
    newEpreuve.duree_minutes = creerEpreuveDto.duree_minutes;
    newEpreuve.matiere_id = creerEpreuveDto.matiere_id;
    newEpreuve.professeur_id = professeurId;
    newEpreuve.date_publication = creerEpreuveDto.date_publication;
    const saved = await this.epreuvesRepository.save(newEpreuve);
    this.logger.log(`Épreuve créée: ${saved.titre} (ID: ${saved.id}, Matière: ${saved.matiere_id})`);
    return saved;
  }

  async findAll() {
    this.logger.log('Récupération de toutes les épreuves');
    const epreuves = await this.epreuvesRepository.find({
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s)`);

    // Transform to response DTO format with sanitized professeur
    return epreuves.map(epreuve => ({
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    }));
  }

  async findOne(id: string) {
    this.logger.log(`Recherche de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
    });

    if (!epreuve) {
      this.logger.warn(`Épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    this.logger.log(`Épreuve trouvée: ${epreuve.titre} (ID: ${id})`);

    // Transform to response DTO format with sanitized professeur
    return {
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    };
  }

  async update(id: string, majEpreuveDto: MajEpreuveDto) {
    this.logger.log(`Mise à jour de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['professeur'],
    });

    if (!epreuve) {
      this.logger.warn(`Mise à jour échouée: épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    Object.assign(epreuve, majEpreuveDto);
    const updated = await this.epreuvesRepository.save(epreuve);
    this.logger.log(`Épreuve mise à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!epreuve) {
      this.logger.warn(`Suppression échouée: épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    await this.epreuvesRepository.remove(epreuve);
    this.logger.log(`Épreuve supprimée: ${epreuve.titre} (ID: ${id})`);
    return { message: 'Épreuve supprimée avec succès' };
  }

  async findByMatiere(matiereId: string) {
    this.logger.log(`Recherche des épreuves pour matière ID: ${matiereId}`);
    const epreuves = await this.epreuvesRepository.find({
      where: { matiere: { id: parseInt(matiereId) } },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s) pour matière ${matiereId}`);

    // Transform to response DTO format with sanitized professeur
    return epreuves.map(epreuve => ({
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    }));
  }

  async findByProfesseur(professeurId: string) {
    this.logger.log(`Recherche des épreuves du professeur ID: ${professeurId}`);
    const epreuves = await this.epreuvesRepository.find({
      where: { professeur: { id: parseInt(professeurId) } },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: {
        date_creation: 'DESC',
      },
    });
    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s) pour professeur ${professeurId}`);

    // Transform to response DTO format with sanitized professeur
    return epreuves.map(epreuve => ({
      id: epreuve.id,
      titre: epreuve.titre,
      url: epreuve.url,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      professeur: {
        nom: epreuve.professeur.nom,
        prenom: epreuve.professeur.prenom,
        telephone: epreuve.professeur.telephone,
      },
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement_id: epreuve.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    }));
  }
}