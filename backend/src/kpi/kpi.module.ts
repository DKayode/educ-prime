import { Module } from '@nestjs/common';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';

@Module({
  // La complétion moyenne du profil réutilise le calcul de #259 plutôt que
  // d'en tenir une seconde définition.
  imports: [UtilisateursModule],
  controllers: [KpiController],
  providers: [KpiService],
})
export class KpiModule {}
