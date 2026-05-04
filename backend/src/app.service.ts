import { Injectable } from '@nestjs/common';
import { Repository, Not } from 'typeorm';
import { Utilisateur, RoleType } from './utilisateurs/entities/utilisateur.entity';
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
import { Parcour } from './parcours/entities/parcour.entity';
import { Category } from './categories/entities/category.entity';
import { DataSourceResolver } from './config/data-source-resolver.service';

@Injectable()
export class AppService {
  constructor(
    private readonly resolver: DataSourceResolver,
  ) { }

  private get utilisateursRepository(): Repository<Utilisateur> { return this.resolver.getRepository(Utilisateur); }
  private get etablissementsRepository(): Repository<Etablissement> { return this.resolver.getRepository(Etablissement); }
  private get filieresRepository(): Repository<Filiere> { return this.resolver.getRepository(Filiere); }
  private get matieresRepository(): Repository<Matiere> { return this.resolver.getRepository(Matiere); }
  private get epreuvesRepository(): Repository<Epreuve> { return this.resolver.getRepository(Epreuve); }
  private get ressourcesRepository(): Repository<Ressource> { return this.resolver.getRepository(Ressource); }
  private get publicitesRepository(): Repository<Publicite> { return this.resolver.getRepository(Publicite); }
  private get evenementsRepository(): Repository<Evenement> { return this.resolver.getRepository(Evenement); }
  private get opportunitesRepository(): Repository<Opportunite> { return this.resolver.getRepository(Opportunite); }
  private get concoursRepository(): Repository<Concours> { return this.resolver.getRepository(Concours); }
  private get contactsProfessionnelsRepository(): Repository<ContactsProfessionnel> { return this.resolver.getRepository(ContactsProfessionnel); }
  private get parcoursRepository(): Repository<Parcour> { return this.resolver.getRepository(Parcour); }
  private get categoriesRepository(): Repository<Category> { return this.resolver.getRepository(Category); }

  async getStats(pays: string): Promise<{
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
    parcoursCount: number;
    categoriesCount: number;
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
      parcoursCount,
      categoriesCount,
    ] = await Promise.all([
      this.utilisateursRepository.count({ where: { role: Not(RoleType.ADMIN), pays } }),
      this.etablissementsRepository.count({ where: { pays } }),
      this.filieresRepository.count({ where: { pays } }),
      this.matieresRepository.count({ where: { pays } }),
      this.epreuvesRepository.count({ where: { pays } }),
      this.ressourcesRepository.count({ where: { pays } }),
      this.publicitesRepository.count({ where: { pays } }),
      this.evenementsRepository.count({ where: { pays } }),
      this.opportunitesRepository.count({ where: { pays } }),
      this.concoursRepository.count({ where: { pays } }),
      this.contactsProfessionnelsRepository.count({ where: { pays } }),
      this.parcoursRepository.count({ where: { pays } }),
      this.categoriesRepository.count({ where: { pays } })

    ]);

    return {
      usersCount,
      etablissementsCount,
      filieresCount,
      matieresCount,
      epreuvesCount: epreuvesCount + ressourcesCount + concoursCount,
      ressourcesCount,
      publicitesCount,
      evenementsCount,
      opportunitesCount,
      concoursCount,
      contactsProfessionnelsCount,
      parcoursCount,
      categoriesCount
    };
  }
}