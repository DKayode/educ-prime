import { Module } from '@nestjs/common';
import { KessiahController } from './kessiah.controller';
import { KessiahService } from './kessiah.service';

/**
 * Intégration du service de lecture d'épreuves Kessiah.
 *
 * Exporte `KessiahService` pour que le module des soumissions déclenche
 * l'extraction à l'approbation — point d'ingestion naturel, puisque l'OCR
 * devient alors un coût de catalogue et non un coût d'usage.
 */
@Module({
    controllers: [KessiahController],
    providers: [KessiahService],
    exports: [KessiahService],
})
export class KessiahModule { }
