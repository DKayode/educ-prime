import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { FeeType } from '../../shared/payment.enums';

export class UpdatePaymentConfigurationDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minimumWithdrawal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maximumWithdrawal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) withdrawFee?: number;
  @ApiPropertyOptional({ enum: FeeType }) @IsOptional() @IsEnum(FeeType) withdrawFeeType?: FeeType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rewardPerExam?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) rewardPerConcours?: number;
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
}
