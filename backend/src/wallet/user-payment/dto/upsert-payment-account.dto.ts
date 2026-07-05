import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { BENIN_MOBILE_MONEY_PHONE_ERROR_MESSAGE, BENIN_MOBILE_MONEY_PHONE_REGEX } from '../../shared/benin-phone-number.util';
import { MobileMoneyProvider } from '../../shared/payment.enums';

export class UpsertPaymentAccountDto {
  @ApiProperty({ enum: MobileMoneyProvider }) @IsEnum(MobileMoneyProvider) operator: MobileMoneyProvider;
  @ApiProperty({ example: '+229 0197000000', description: 'Format obligatoire : +229 01XXXXXXXX' })
  @IsString()
  @MaxLength(30)
  @Matches(BENIN_MOBILE_MONEY_PHONE_REGEX, { message: BENIN_MOBILE_MONEY_PHONE_ERROR_MESSAGE })
  phoneNumber: string;
  @ApiProperty({ example: 'Nom du titulaire' }) @IsString() @MaxLength(150) accountName: string;
}
