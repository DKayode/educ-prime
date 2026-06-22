import { TypeFichier } from '../entities/fichier.entity';
import { EpreuveType } from '../../epreuves/entities/epreuve.entity';

/**
 * Interface for file upload data after conversion from FormData.
 * All numeric fields have been converted from strings to numbers.
 */
export interface FichierUploadData {
    type: TypeFichier;
    matiereId?: number;
    epreuveId?: number;
    epreuveTitre?: string;
    epreuveType?: EpreuveType;
    dureeMinutes?: number;
    nombrePages?: number;
    datePublication?: string;
    entityId?: number;
    entitySubtype?: string;
}
