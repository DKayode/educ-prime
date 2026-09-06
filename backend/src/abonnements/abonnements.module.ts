import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { AbonnementsAdminController } from './abonnements-admin.controller';
import { AbonnementsController } from './abonnements.controller';
import { AbonnementsService } from './abonnements.service';
import { AbonnementEvenement } from './entities/abonnement-evenement.entity';
import { Abonnement } from './entities/abonnement.entity';
import { PlanAbonnement } from './entities/plan-abonnement.entity';
import { EntitlementService } from './entitlement.service';
import { AbonnementRequisGuard } from './guards/abonnement-requis.guard';
import { PlansService } from './plans.service';

/**
 * Socle des abonnements.
 *
 * `EntitlementService` et `AbonnementRequisGuard` sont exportés : ce sont les
 * seules surfaces que les autres modules (concours ici, épreuves et examens
 * nationaux en #245, stats IA en #249) doivent connaître.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PlanAbonnement, Abonnement, AbonnementEvenement, Utilisateur])],
  controllers: [AbonnementsController, AbonnementsAdminController],
  providers: [AbonnementsService, PlansService, EntitlementService, AbonnementRequisGuard],
  exports: [EntitlementService, AbonnementRequisGuard, AbonnementsService],
})
export class AbonnementsModule {}
