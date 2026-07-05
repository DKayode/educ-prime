import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyWithdrawalOtpDto {
  @ApiProperty({
    example: '123456',
    description: 'Code OTP reçu par SMS sur le numéro Mobile Money de retrait',
  })
  @IsString()
  @Length(4, 8)
  @Matches(/^\d+$/, { message: 'Le code OTP doit contenir uniquement des chiffres' })
  code: string;
}
