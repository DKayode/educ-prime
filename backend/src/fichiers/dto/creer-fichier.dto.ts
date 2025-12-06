import { TypeFichier, TypeRessource } from '../entities/fichier.entity';
import { IsEnum, IsOptional, IsString, IsIn } from 'class-validator';

/**
 * DTO for file upload via multipart/form-data.
 * All numeric fields are received as strings from FormData and will be
 * converted to numbers in the controller before passing to the service.
 */
export class CreerFichierDto {
  @IsIn(Object.values(TypeFichier), {
    message: 'type must be one of the following values: profile, epreuve, ressource, PUBLICITE, EVENEMENT, OPPORTUNITE, CONCOURS_EXAMEN'
  })
  readonly type: TypeFichier;

  @IsIn(Object.values(TypeRessource), {
    message: 'typeRessource must be one of the following values: Document, Quiz, Exercices'
  })
  @IsOptional()
  readonly typeRessource?: TypeRessource;

  // Numeric fields received as strings from FormData
  @IsString()
  @IsOptional()
  readonly matiereId?: string;

  @IsString()
  @IsOptional()
  readonly epreuveId?: string;

  // Fields for creating new epreuve
  @IsString()
  @IsOptional()
  readonly epreuveTitre?: string;

  // Received as string from FormData
  @IsString()
  @IsOptional()
  readonly dureeMinutes?: string;

  @IsString()
  @IsOptional()
  readonly datePublication?: string;

  @IsString()
  @IsOptional()
  readonly ressourceId?: string;

  // Fields for creating new ressource
  @IsString()
  @IsOptional()
  readonly ressourceTitre?: string;

  // Fields for public content modules (PUBLICITE, EVENEMENT, OPPORTUNITE, CONCOURS_EXAMEN)
  @IsString()
  @IsOptional()
  readonly entityId?: string;

  @IsString()
  @IsOptional()
  readonly entitySubtype?: string; // For Opportunites: 'bourses' or 'stages', For ConcoursExamens: 'concours' or 'examens'
}