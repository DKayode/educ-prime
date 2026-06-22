import { ApiProperty } from '@nestjs/swagger';
import { TypeFichier } from '../entities/fichier.entity';
import { EpreuveType } from '../../epreuves/entities/epreuve.entity';
import { IsEnum, IsOptional, IsString, IsIn } from 'class-validator';

/**
 * DTO for file upload via multipart/form-data.
 * All numeric fields are received as strings from FormData and will be
 * converted to numbers in the controller before passing to the service.
 */
export class CreerFichierDto {
  @ApiProperty({
    enum: TypeFichier,
    description: 'Type de fichier',
    example: TypeFichier.EPREUVE
  })
  @IsIn(Object.values(TypeFichier), {
    message: 'type must be one of the following values: profile, epreuve, PUBLICITE, EVENEMENT, OPPORTUNITE, CONCOURS, ETABLISSEMENT, CATEGORIES, FORUMS'
  })
  readonly type: TypeFichier;

  // Numeric fields received as strings from FormData
  @ApiProperty({ description: 'ID de la matière', required: false })
  @IsString()
  @IsOptional()
  readonly matiereId?: string;

  @ApiProperty({ description: 'ID de l\'épreuve', required: false })
  @IsString()
  @IsOptional()
  readonly epreuveId?: string;

  // Fields for creating new epreuve
  @ApiProperty({ description: 'Titre de la nouvelle épreuve', required: false })
  @IsString()
  @IsOptional()
  readonly epreuveTitre?: string;

  @ApiProperty({
    enum: EpreuveType,
    description: 'Type d\'épreuve',
    required: false
  })
  @IsEnum(EpreuveType, {
    message: 'epreuveType must be a valid EpreuveType value'
  })
  @IsOptional()
  readonly epreuveType?: EpreuveType;

  // Received as string from FormData
  @ApiProperty({ description: 'Durée en minutes', required: false })
  @IsString()
  @IsOptional()
  readonly dureeMinutes?: string;

  @ApiProperty({ description: 'Nombre de pages', required: false })
  @IsString()
  @IsOptional()
  readonly nombrePages?: string;

  @ApiProperty({ description: 'Date de publication', required: false })
  @IsString()
  @IsOptional()
  readonly datePublication?: string;

  // Fields for public content modules (PUBLICITE, EVENEMENT, OPPORTUNITE, CONCOURS_EXAMEN)
  @ApiProperty({ description: 'ID de l\'entité associée (pub, event, etc.)', required: false })
  @IsString()
  @IsOptional()
  readonly entityId?: string;

  @ApiProperty({ description: 'Sous-type d\'entité', required: false })
  @IsString()
  @IsOptional()
  readonly entitySubtype?: string; // For Opportunites: 'bourses' or 'stages', For ConcoursExamens: 'concours' or 'examens'
}