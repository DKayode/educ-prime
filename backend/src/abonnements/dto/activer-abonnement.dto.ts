import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * Activation manuelle par un admin — l'encaissement se fait hors application
 * tant que #248 n'est pas livrée. Reste utile ensuite : webhook perdu, paiement
 * en espèces, geste commercial.
 */
export class ActiverAbonnementDto {
  @ApiProperty({ example: 2000, description: 'Montant réellement encaissé' })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(0, { message: 'Le montant ne peut pas être négatif' })
  montant_paye: number;

  @ApiPropertyOptional({ example: 'MoMo 2026-09-06 12:31', description: 'Trace de l’encaissement' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reference_paiement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  commentaire?: string;
}
