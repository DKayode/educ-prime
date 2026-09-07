import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { MethodePaiement, PrestatairePaiement } from '../shared/paiement.enums';

export class InitierPaiementDto {
  @IsUUID('4', { message: "L'abonnement doit être identifié par un UUID" })
  abonnement_uuid: string;

  @ApiPropertyOptional({ enum: PrestatairePaiement })
  @IsOptional()
  @IsEnum(PrestatairePaiement)
  prestataire?: PrestatairePaiement;

  @ApiPropertyOptional({ enum: MethodePaiement })
  @IsOptional()
  @IsEnum(MethodePaiement)
  methode?: MethodePaiement;

  @IsOptional()
  @IsString()
  @Length(6, 30)
  telephone?: string;
}
