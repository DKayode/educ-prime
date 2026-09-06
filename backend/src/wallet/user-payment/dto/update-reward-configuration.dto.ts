import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { FeeType } from '../../shared/payment.enums';

export class UpdateRewardConfigurationDto {
  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rewardAmount?: number;

  @ApiPropertyOptional({ example: 'XOF' })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  currency?: string;

  @ApiPropertyOptional({
    enum: FeeType,
    description: 'FIXED : rewardAmount s’applique. PERCENTAGE : commissionPercentage du montant payé.',
  })
  @IsOptional()
  @IsEnum(FeeType, { message: 'commissionType doit valoir FIXED ou PERCENTAGE' })
  commissionType?: FeeType;

  @ApiPropertyOptional({ example: 10, description: 'Taux de commission, entre 0 et 100.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100, { message: 'Le taux ne peut pas dépasser 100 %' })
  commissionPercentage?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  rewardEnabled?: boolean;

  @ApiPropertyOptional({ example: 0, description: '0 = crédit disponible immédiatement ; >0 = crédit en attente.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reviewDelayHours?: number;

  @ApiPropertyOptional({ example: false, description: 'Si true, le crédit est mis en pendingBalance.' })
  @IsOptional()
  @IsBoolean()
  requiresAdminValidation?: boolean;

  @ApiPropertyOptional({ example: 0, description: '0 = aucune limite journalière en montant.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRewardAmountLimit?: number;

  @ApiPropertyOptional({ example: 0, description: '0 = aucune limite mensuelle en montant.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRewardAmountLimit?: number;

  @ApiPropertyOptional({ example: 0, description: '0 = aucun plafond journalier en nombre de récompenses.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRewardsPerUserPerDay?: number;

  @ApiPropertyOptional({ example: 0, description: '0 = aucun plafond mensuel en nombre de récompenses.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRewardsPerUserPerMonth?: number;

  @ApiPropertyOptional({ example: { note: 'Règles spécifiques aux concours' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
