import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { KessiahController } from './kessiah.controller';
import { KessiahService } from './kessiah.service';
import { RelectureService } from './relecture.service';

/**
 * Intégration du service de lecture d'épreuves Kessiah.
 *
 * Exporte `KessiahService` pour que le module des soumissions déclenche
 * l'extraction à l'approbation — point d'ingestion naturel, puisque l'OCR
 * devient alors un coût de catalogue et non un coût d'usage.
 */
@Module({
    // FilesModule pour retrouver le document à relire dans le stockage objet.
    imports: [FilesModule],
    controllers: [KessiahController],
    providers: [KessiahService, RelectureService],
    exports: [KessiahService],
})
export class KessiahModule { }
