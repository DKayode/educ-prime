import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './utilisateurs/entities/utilisateur.entity';
import { Etablissement } from './etablissements/entities/etablissement.entity';
import { Filiere } from './filieres/entities/filiere.entity';
import { Matiere } from './matieres/entities/matiere.entity';
import { Epreuve } from './epreuves/entities/epreuve.entity';
import { Ressource } from './ressources/entities/ressource.entity';
import { Publicite } from './publicites/entities/publicite.entity';
import { Evenement } from './evenements/entities/evenement.entity';
import { Opportunite } from './opportunites/entities/opportunite.entity';
import { Concours } from './concours/entities/concours.entity';
import { ContactsProfessionnel } from './contacts-professionnels/entities/contacts-professionnel.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Utilisateur)
    private utilisateursRepository: Repository<Utilisateur>,
    @InjectRepository(Etablissement)
    private etablissementsRepository: Repository<Etablissement>,
    @InjectRepository(Filiere)
    private filieresRepository: Repository<Filiere>,
    @InjectRepository(Matiere)
    private matieresRepository: Repository<Matiere>,
    @InjectRepository(Epreuve)
    private epreuvesRepository: Repository<Epreuve>,
    @InjectRepository(Ressource)
    private ressourcesRepository: Repository<Ressource>,
    @InjectRepository(Publicite)
    private publicitesRepository: Repository<Publicite>,
    @InjectRepository(Evenement)
    private evenementsRepository: Repository<Evenement>,
    @InjectRepository(Opportunite)
    private opportunitesRepository: Repository<Opportunite>,
    @InjectRepository(Concours)
    private concoursRepository: Repository<Concours>,
    @InjectRepository(ContactsProfessionnel)
    private contactsProfessionnelsRepository: Repository<ContactsProfessionnel>,
  ) { }

  getApiInfo(): object {
    return {
      name: 'Educ Prime API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        auth: '/auth',
        utilisateurs: '/utilisateurs',
        etablissements: '/etablissements',
        filieres: '/filieres',
        niveauEtude: '/niveau-etude',
        matieres: '/matieres',
        epreuves: '/epreuves',
        ressources: '/ressources',
        fichiers: '/fichiers',
        publicites: '/publicites',
        evenements: '/evenements',
        opportunites: '/opportunites',
        concours: '/concours',
        contactsProfessionnels: '/contacts-professionnels',
        stats: '/stats'
      }
    };
  }

  async getStats(): Promise<{
    usersCount: number;
    etablissementsCount: number;
    filieresCount: number;
    matieresCount: number;
    epreuvesCount: number;
    ressourcesCount: number;
    publicitesCount: number;
    evenementsCount: number;
    opportunitesCount: number;
    concoursCount: number;
    contactsProfessionnelsCount: number;
  }> {
    const [
      usersCount,
      etablissementsCount,
      filieresCount,
      matieresCount,
      epreuvesCount,
      ressourcesCount,
      publicitesCount,
      evenementsCount,
      opportunitesCount,
      concoursCount,
      contactsProfessionnelsCount,
    ] = await Promise.all([
      this.utilisateursRepository.count(),
      this.etablissementsRepository.count(),
      this.filieresRepository.count(),
      this.matieresRepository.count(),
      this.epreuvesRepository.count(),
      this.ressourcesRepository.count(),
      this.publicitesRepository.count(),
      this.evenementsRepository.count(),
      this.opportunitesRepository.count(),
      this.concoursRepository.count(),
      this.contactsProfessionnelsRepository.count(),
    ]);

    return {
      usersCount,
      etablissementsCount,
      filieresCount,
      matieresCount,
      epreuvesCount,
      ressourcesCount,
      publicitesCount,
      evenementsCount,
      opportunitesCount,
      concoursCount,
      contactsProfessionnelsCount,
    };
  }
}