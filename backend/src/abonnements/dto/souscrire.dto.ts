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
      'Le propriétaire du code perçoit la commission de cet abonnement. SANS code, aucune ' +
      'commission n’est versée — le parrain d’inscription ne suffit pas. Un code inconnu ' +
      'est ignoré sans erreur.',
  })
  @IsOptional()
  @IsString()
  @Length(4, 20, { message: 'Le code de parrainage est invalide' })
  code_parrainage?: string;
}
