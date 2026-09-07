import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PrestatairePaiement, StatutPaiement } from '../shared/paiement.enums';

export class FilterPaiementsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(StatutPaiement)
  statut?: StatutPaiement;

  @IsOptional()
  @IsEnum(PrestatairePaiement)
  prestataire?: PrestatairePaiement;

  @IsOptional()
  @IsString()
  search?: string;
}
