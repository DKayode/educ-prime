import { Module } from '@nestjs/common';
import { WalletModule } from './wallet.module';

@Module({
  imports: [WalletModule],
  exports: [WalletModule],
})
export class PaymentModule { }
