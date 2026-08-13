import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
import { MOBILE_MONEY_PHONE_ERROR_MESSAGE, MOBILE_MONEY_PHONE_FORMATS, MOBILE_MONEY_PHONE_REGEX } from '../../shared/mobile-money-phone.util';
import { MobileMoneyProvider } from '../../shared/payment.enums';

export class UpsertPaymentAccountDto {
  @ApiProperty({ enum: MobileMoneyProvider }) @IsEnum(MobileMoneyProvider) operator: MobileMoneyProvider;
  @ApiProperty({ example: '+229 0197000000', description: `Formats acceptés : ${MOBILE_MONEY_PHONE_FORMATS}` })
  @IsString()
  @MaxLength(30)
  @Matches(MOBILE_MONEY_PHONE_REGEX, { message: MOBILE_MONEY_PHONE_ERROR_MESSAGE })
  phoneNumber: string;
  @ApiProperty({ example: 'Nom du titulaire' }) @IsString() @MaxLength(150) accountName: string;
}
