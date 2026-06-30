import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { UserPaymentModule } from './user-payment/user-payment.module';

@Module({
  imports: [WalletModule, UserPaymentModule],
  exports: [WalletModule, UserPaymentModule],
})
export class PaymentModule {}
