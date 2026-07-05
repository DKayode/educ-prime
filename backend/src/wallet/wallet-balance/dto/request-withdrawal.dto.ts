import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { PaymentMethod } from '../../shared/payment.enums';

export class RequestWithdrawalDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MOBILE_MONEY })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.MOBILE_MONEY;

  @ApiProperty({ description: 'ID du compte Mobile Money enregistré' })
  @IsUUID()
  paymentAccountId: string;
}
