import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ConfirmerPaiementDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  montant?: number;

  @IsOptional()
  @IsString()
  reference_prestataire?: string;

  @IsOptional()
  @IsString()
  commentaire?: string;
}

