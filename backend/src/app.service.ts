import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './utilisateurs/entities/utilisateur.entity';
import { Etablissement } from './etablissements/entities/etablissement.entity';
import { Filiere } from './filieres/entities/filiere.entity';
import { Matiere } from './matieres/entities/matiere.entity';
import { Epreuve } from './epreuves/entities/epreuve.entity';

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
  ) {}

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
  }> {
    const [usersCount, etablissementsCount, filieresCount, matieresCount, epreuvesCount] =
      await Promise.all([
        this.utilisateursRepository.count(),
        this.etablissementsRepository.count(),
        this.filieresRepository.count(),
        this.matieresRepository.count(),
        this.epreuvesRepository.count(),
      ]);

    return {
      usersCount,
      etablissementsCount,
      filieresCount,
      matieresCount,
      epreuvesCount,
    };
  }
}