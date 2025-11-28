import { TypeFichier, TypeRessource } from '../entities/fichier.entity';

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
    dureeMinutes?: number;
    datePublication?: string;
    ressourceTitre?: string;
}
