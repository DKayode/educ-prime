import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';
import { BENIN_MOBILE_MONEY_PHONE_ERROR_MESSAGE, BENIN_MOBILE_MONEY_PHONE_REGEX } from '../../shared/benin-phone-number.util';
import { MobileMoneyProvider } from '../../shared/payment.enums';

export class ConfirmManualPaymentDto {
  @ApiProperty({ enum: MobileMoneyProvider }) @IsEnum(MobileMoneyProvider) provider: MobileMoneyProvider;
  @ApiProperty({ example: 'MM240630001122' }) @IsString() @MaxLength(150) transactionReference: string;
  @ApiProperty({ example: '+229 0197000000', description: 'Format obligatoire : +229 01XXXXXXXX' })
  @IsString()
  @MaxLength(30)
  @Matches(BENIN_MOBILE_MONEY_PHONE_REGEX, { message: BENIN_MOBILE_MONEY_PHONE_ERROR_MESSAGE })
  phoneNumber: string;
  @ApiProperty({ example: 1000 }) @IsNumber() @IsPositive() paidAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() paidAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() internalNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proofFileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proofFileName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proofMimeType?: string;
}
