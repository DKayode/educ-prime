import { Inject, Injectable } from '@nestjs/common';
import { WALLET_TRANSACTION_REPOSITORY } from '../../shared/payment.tokens';
import { WalletTransactionRepositoryPort } from '../../shared/payment.ports';
import { CreateWalletForUserUseCase } from './create-wallet-for-user.use-case';

@Injectable()
export class GetMyWalletUseCase {
  constructor(
    private readonly createWalletForUser: CreateWalletForUserUseCase,
    @Inject(WALLET_TRANSACTION_REPOSITORY) private readonly transactions: WalletTransactionRepositoryPort,
  ) {}

  async execute(userId: number, page = 1, limit = 20) {
    const wallet = await this.createWalletForUser.execute(userId);
    const transactions = await this.transactions.findByWalletId(wallet.id!, page, limit);
    return { wallet, transactions: transactions.data, totalTransactions: transactions.total, page, limit };
  }
}
