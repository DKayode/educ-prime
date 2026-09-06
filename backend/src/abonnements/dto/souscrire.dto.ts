import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, IsUUID } from 'class-validator';

export class SouscrireDto {
  @ApiProperty({ description: 'UUID du plan choisi' })
  @IsUUID('4', { message: 'Le plan doit être identifié par un UUID' })
  @IsNotEmpty({ message: 'Le plan est requis' })
  plan_uuid: string;

  /**
   * Code de parrainage présenté à l'achat (#246).
   *
   * SEUL moyen de déclencher une commission : sans code, personne n'est
   * crédité, y compris le parrain d'inscription. La relation
   * `utilisateurs.parrain_id` n'est ni lue ni écrite ici.
   */
  @ApiPropertyOptional({
    example: 'GZT8NW',
    description:
      'Alias historique de `code`. Conservé pour le mobile déjà déployé ; préférez `code`, ' +
      'qui accepte aussi bien un code de parrainage qu’un code de réduction.',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @Length(3, 50, { message: 'Le code de parrainage est invalide' })
  code_parrainage?: string;

  /**
   * Code unique de l'achat (#247).
   *
   * Un SEUL champ pour les trois usages : parrainage, ambassadeur, réduction.
   * L'utilisateur ne sait pas — et n'a pas à savoir — de quelle nature est le
   * code qu'on lui a donné ; c'est le registre qui tranche.
   */
  @ApiPropertyOptional({
    example: 'RENTREE2026',
    description:
      'Code de parrainage OU de réduction. Le registre détermine son effet : remise sur ' +
      'le prix, commission au propriétaire, ou les deux. Un code invalide est ignoré sans ' +
      'erreur.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 50, { message: 'Le code est invalide' })
  code?: string;
}
