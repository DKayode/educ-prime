import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
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
        fichiers: '/fichiers'
      }
    };
  }
}