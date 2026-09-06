import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, IsUUID } from 'class-validator';

export class SouscrireDto {
  @ApiProperty({ description: 'UUID du plan choisi' })
  @IsUUID('4', { message: 'Le plan doit être identifié par un UUID' })
  @IsNotEmpty({ message: 'Le plan est requis' })
  plan_uuid: string;

  /**
   * Code de parrainage saisi à l'achat (#246).
   *
   * Son propriétaire perçoit la commission de CET abonnement, à la place du
   * parrain d'inscription. La relation `utilisateurs.parrain_id` n'est pas
   * touchée : réécrire une donnée d'acquisition réattribuerait rétroactivement
   * toutes les commissions futures.
   */
  @ApiPropertyOptional({
    example: 'GZT8NW',
    description:
      'Le propriétaire du code perçoit la commission de cet abonnement. Le parrain ' +
      'd’inscription reste inchangé. Un code inconnu est ignoré sans erreur.',
  })
  @IsOptional()
  @IsString()
  @Length(4, 20, { message: 'Le code de parrainage est invalide' })
  code_parrainage?: string;
}
