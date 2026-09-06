import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, IsUUID } from 'class-validator';

export class SouscrireDto {
  @ApiProperty({ description: 'UUID du plan choisi' })
  @IsUUID('4', { message: 'Le plan doit être identifié par un UUID' })
  @IsNotEmpty({ message: 'Le plan est requis' })
  plan_uuid: string;

  /**
   * Code de parrainage saisi au moment de la souscription (#246).
   *
   * Ne sert qu'à un utilisateur qui n'avait PAS de parrain : la relation posée
   * à l'inscription prime, et n'est jamais réécrite ici.
   */
  @ApiPropertyOptional({ example: 'GZT8NW', description: 'Ignoré si l’utilisateur a déjà un parrain' })
  @IsOptional()
  @IsString()
  @Length(4, 20, { message: 'Le code de parrainage est invalide' })
  code_parrainage?: string;
}
