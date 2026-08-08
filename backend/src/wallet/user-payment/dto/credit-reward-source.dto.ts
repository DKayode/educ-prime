import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Length, Min } from 'class-validator';
import { RewardSourceTypeCode } from '../../shared/payment.enums';

export class CreditRewardSourceDto {
  @ApiProperty({ enum: RewardSourceTypeCode, example: RewardSourceTypeCode.EPREUVE })
  @IsEnum(RewardSourceTypeCode)
  sourceType: RewardSourceTypeCode;

  @ApiProperty({ example: 'concours-douanes-2026-001', description: 'Identifiant du contenu validé : épreuve, examen ou concours.' })
  @IsString()
  @Length(1, 150)
  sourceId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  userId: number;

  @ApiPropertyOptional({ example: 1000, description: 'Optionnel. Si absent, le module Wallet utilise la configuration du type.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ example: 'XOF' })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  currency?: string;

  @ApiPropertyOptional({ example: 'CONCOURS_REWARD:concours-douanes-2026-001' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  reference?: string;

  @ApiPropertyOptional({ example: 'Crédit wallet après validation du contenu chargé' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { module: 'concours', validatedBy: 1 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
