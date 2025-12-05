import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etablissement } from './entities/etablissement.entity';
import { Filiere } from '../filieres/entities/filiere.entity';
import { NiveauEtude } from '../niveau-etude/entities/niveau-etude.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { Ressource } from '../ressources/entities/ressource.entity';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';

@Injectable()
export class EtablissementsService {
  private readonly logger = new Logger(EtablissementsService.name);

  constructor(
    @InjectRepository(Etablissement)
    private readonly etablissementsRepository: Repository<Etablissement>,
    @InjectRepository(Filiere)
    private readonly filieresRepository: Repository<Filiere>,
    @InjectRepository(NiveauEtude)
    private readonly niveauEtudeRepository: Repository<NiveauEtude>,
    @InjectRepository(Matiere)
    private readonly matieresRepository: Repository<Matiere>,
    @InjectRepository(Epreuve)
    private readonly epreuvesRepository: Repository<Epreuve>,
    @InjectRepository(Ressource)
    private readonly ressourcesRepository: Repository<Ressource>,
  ) { }

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

  // Hierarchical navigation methods
  async findFilieresById(id: string) {
    this.logger.log(`Récupération des filières pour établissement ID: ${id}`);
    await this.findOne(id); // Verify etablissement exists

    const filieres = await this.filieresRepository.find({
      where: { etablissement: { id: parseInt(id) } },
    });

    this.logger.log(`${filieres.length} filière(s) trouvée(s) pour établissement ${id}`);
    return filieres;
  }

  async findNiveauEtudeByFiliere(etablissementId: string, filiereId: string) {
    this.logger.log(`Récupération des niveaux d'étude pour filière ID: ${filiereId}`);

    // Verify filiere belongs to etablissement
    const filiere = await this.filieresRepository.findOne({
      where: {
        id: parseInt(filiereId),
        etablissement: { id: parseInt(etablissementId) }
      },
    });

    if (!filiere) {
      throw new NotFoundException('Filière non trouvée pour cet établissement');
    }

    const niveaux = await this.niveauEtudeRepository.find({
      where: { filiere: { id: parseInt(filiereId) } },
      relations: ['filiere'],
    });

    this.logger.log(`${niveaux.length} niveau(x) d'étude trouvé(s) pour filière ${filiereId}`);

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

  async findMatieresByNiveauEtude(etablissementId: string, filiereId: string, niveauEtudeId: string) {
    this.logger.log(`Récupération des matières pour niveau d'étude ID: ${niveauEtudeId}`);

    // Verify niveau_etude belongs to filiere and etablissement
    const niveauEtude = await this.niveauEtudeRepository.findOne({
      where: {
        id: parseInt(niveauEtudeId),
        filiere: {
          id: parseInt(filiereId),
          etablissement: { id: parseInt(etablissementId) }
        }
      },
    });

    if (!niveauEtude) {
      throw new NotFoundException('Niveau d\'étude non trouvé pour cette filière');
    }

    const matieres = await this.matieresRepository.find({
      where: { niveau_etude: { id: parseInt(niveauEtudeId) } },
      relations: ['niveau_etude', 'niveau_etude.filiere'],
    });

    this.logger.log(`${matieres.length} matière(s) trouvée(s) pour niveau d'étude ${niveauEtudeId}`);

    // Transform to response DTO format
    return matieres.map(matiere => ({
      id: matiere.id,
      nom: matiere.nom,
      description: matiere.description,
      niveau_etude: {
        id: matiere.niveau_etude.id,
        nom: matiere.niveau_etude.nom,
        duree_mois: matiere.niveau_etude.duree_mois,
        filiere: {
          id: matiere.niveau_etude.filiere.id,
          nom: matiere.niveau_etude.filiere.nom,
          etablissement_id: matiere.niveau_etude.filiere.etablissement_id,
        },
      },
    }));
  }

  async findEpreuvesByMatiere(etablissementId: string, filiereId: string, niveauEtudeId: string, matiereId: string) {
    this.logger.log(`Récupération des épreuves pour matière ID: ${matiereId}`);

    // Verify matiere belongs to niveau_etude, filiere, and etablissement
    const matiere = await this.matieresRepository.findOne({
      where: {
        id: parseInt(matiereId),
        niveau_etude: {
          id: parseInt(niveauEtudeId),
          filiere: {
            id: parseInt(filiereId),
            etablissement: { id: parseInt(etablissementId) }
          }
        }
      },
    });

    if (!matiere) {
      throw new NotFoundException('Matière non trouvée pour ce niveau d\'étude');
    }

    const epreuves = await this.epreuvesRepository.find({
      where: { matiere: { id: parseInt(matiereId) } },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: { date_creation: 'DESC' },
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

  async findRessourcesByMatiere(etablissementId: string, filiereId: string, niveauEtudeId: string, matiereId: string) {
    this.logger.log(`Récupération des ressources pour matière ID: ${matiereId}`);

    // Verify matiere belongs to niveau_etude, filiere, and etablissement
    const matiere = await this.matieresRepository.findOne({
      where: {
        id: parseInt(matiereId),
        niveau_etude: {
          id: parseInt(niveauEtudeId),
          filiere: {
            id: parseInt(filiereId),
            etablissement: { id: parseInt(etablissementId) }
          }
        }
      },
    });

    if (!matiere) {
      throw new NotFoundException('Matière non trouvée pour ce niveau d\'étude');
    }

    const ressources = await this.ressourcesRepository.find({
      where: { matiere: { id: parseInt(matiereId) } },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'professeur'],
      order: { date_creation: 'DESC' },
    });

    this.logger.log(`${ressources.length} ressource(s) trouvée(s) pour matière ${matiereId}`);

    // Transform to response DTO format with sanitized professeur
    return ressources.map(ressource => ({
      id: ressource.id,
      titre: ressource.titre,
      type: ressource.type,
      url: ressource.url,
      date_creation: ressource.date_creation,
      date_publication: ressource.date_publication,
      professeur: {
        nom: ressource.professeur.nom,
        prenom: ressource.professeur.prenom,
        telephone: ressource.professeur.telephone,
      },
      matiere: {
        id: ressource.matiere.id,
        nom: ressource.matiere.nom,
        description: ressource.matiere.description,
        niveau_etude: {
          id: ressource.matiere.niveau_etude.id,
          nom: ressource.matiere.niveau_etude.nom,
          duree_mois: ressource.matiere.niveau_etude.duree_mois,
          filiere: {
            id: ressource.matiere.niveau_etude.filiere.id,
            nom: ressource.matiere.niveau_etude.filiere.nom,
            etablissement_id: ressource.matiere.niveau_etude.filiere.etablissement_id,
          },
        },
      },
    }));
  }
}