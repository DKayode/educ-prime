import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConsultationInterceptor } from './journaliser-consultation.decorator';
import { ResourceAccessService } from './resource-access.service';

/**
 * `JwtModule` est réexporté à dessein. Nest instancie un intercepteur dans le
 * contexte du module qui le pose, pas dans celui qui le déclare : sans cette
 * réexportation, chacun des sept modules instrumentés devrait importer
 * JwtModule pour lui-même, alors qu'aucun n'a de raison de connaître ce détail.
 * Ici, JwtService ne sert qu'à identifier l'auteur d'une consultation sur une
 * fiche publique ; il ne protège aucune route.
 */
@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'your-secret-key' })],
  providers: [ResourceAccessService, ConsultationInterceptor],
  exports: [ResourceAccessService, ConsultationInterceptor, JwtModule],
})
export class ResourceAccessModule {}
