import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { FeeType, OtpProvider } from '../../shared/payment.enums';

export class UpdatePaymentConfigurationDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minimumWithdrawal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maximumWithdrawal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) withdrawFee?: number;
  @ApiPropertyOptional({ enum: FeeType }) @IsOptional() @IsEnum(FeeType) withdrawFeeType?: FeeType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rewardPerExam?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rewardPerConcours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rewardPerExamenNational?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() walletEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() withdrawEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() rewardEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reviewDelayHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) dailyWithdrawalLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) monthlyWithdrawalLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minimumWalletBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxWithdrawPerDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxWithdrawPerWeek?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxWithdrawPerMonth?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() automaticWithdrawal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() maintenanceMode?: boolean;

  @ApiPropertyOptional({ description: 'Active ou désactive la validation OTP avant soumission d’une demande de retrait.' })
  @IsOptional() @IsBoolean() otpEnabled?: boolean;

  @ApiPropertyOptional({ example: 6, description: 'Longueur du code OTP. Valeurs recommandées : 4 à 8 chiffres.' })
  @IsOptional() @IsInt() @IsIn([4, 5, 6, 7, 8]) otpLength?: number;

  @ApiPropertyOptional({ example: 10, description: 'Durée de validité du code OTP en minutes.' })
  @IsOptional() @IsInt() @Min(1) otpTtlMinutes?: number;

  @ApiPropertyOptional({ example: 3, description: 'Nombre maximal de tentatives avant blocage sécurité.' })
  @IsOptional() @IsInt() @Min(1) otpMaxAttempts?: number;

  @ApiPropertyOptional({ example: 60, description: 'Délai minimal entre deux renvois OTP, en secondes.' })
  @IsOptional() @IsInt() @Min(0) otpResendCooldownSeconds?: number;

  @ApiPropertyOptional({ example: 2, description: 'Nombre maximal de renvois OTP autorisés pour une demande.' })
  @IsOptional() @IsInt() @Min(0) otpMaxResends?: number;

  @ApiPropertyOptional({ example: 1440, description: 'Durée de blocage en minutes après atteinte du nombre maximal de tentatives.' })
  @IsOptional() @IsInt() @Min(1) otpLockDurationMinutes?: number;

  @ApiPropertyOptional({ example: true, description: 'Si true, seul un administrateur peut débloquer une demande bloquée par OTP.' })
  @IsOptional() @IsBoolean() otpRequireAdminUnlock?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Si true, le système peut débloquer automatiquement après la durée de blocage.' })
  @IsOptional() @IsBoolean() otpAutoUnlockEnabled?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Si true, l’utilisateur ne peut pas créer une nouvelle demande pendant un blocage OTP.' })
  @IsOptional() @IsBoolean() otpBlockWithdrawalCreation?: boolean;

  @ApiPropertyOptional({ enum: OtpProvider, example: OtpProvider.INFOBIP, description: 'Fournisseur SMS OTP configuré pour les retraits.' })
  @IsOptional() @IsEnum(OtpProvider) otpProvider?: OtpProvider;
}
