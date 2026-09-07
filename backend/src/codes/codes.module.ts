import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbonnementsModule } from '../abonnements/abonnements.module';
import { CodeValidationService } from './code-validation.service';
import { CodesAdminController } from './codes-admin.controller';
import { CodesController } from './codes.controller';
import { CodesService } from './codes.service';
import { CampagneCode } from './entities/campagne-code.entity';
import { CodeUtilisation } from './entities/code-utilisation.entity';
import { Code } from './entities/code.entity';
import { CodeEffet } from './entities/code-effet.entity';

/**
 * Registre unifié des codes : parrainage, ambassadeur, réduction.
 *
 * `CodeValidationService` est la seule surface consommée par le module
 * abonnements — il l'utilise pour valider et consommer un code à la
 * souscription.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Code, CodeEffet, CampagneCode, CodeUtilisation]),
    // Lien à sens unique : AbonnementsModule fournit PlansService pour l'aperçu
    // de remise. L'inverse passe par ModuleRef dans AbonnementsService, ce qui
    // évite de fermer un cycle de modules.
    AbonnementsModule,
  ],
  controllers: [CodesController, CodesAdminController],
  providers: [CodesService, CodeValidationService],
  exports: [CodesService, CodeValidationService],
})
export class CodesModule {}
