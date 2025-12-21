import { TypeFichier, TypeRessource } from '../entities/fichier.entity';
import { EpreuveType } from '../../epreuves/entities/epreuve.entity';

/**
 * Interface for file upload data after conversion from FormData.
 * All numeric fields have been converted from strings to numbers.
 */
export interface FichierUploadData {
    type: TypeFichier;
    typeRessource?: TypeRessource;
    matiereId?: number;
    epreuveId?: number;
    ressourceId?: number;
    epreuveTitre?: string;
    epreuveType?: EpreuveType;
    dureeMinutes?: number;
    nombrePages?: number;
    datePublication?: string;
    ressourceTitre?: string;
    entityId?: number;
    entitySubtype?: string;
}
