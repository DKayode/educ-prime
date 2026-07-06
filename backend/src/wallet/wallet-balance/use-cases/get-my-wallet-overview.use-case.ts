import { Inject, Injectable } from '@nestjs/common';
import { WALLET_TRANSACTION_REPOSITORY } from '../../shared/payment.tokens';
import { WalletTransactionRepositoryPort } from '../../shared/payment.ports';
import { CreateWalletForUserUseCase } from './create-wallet-for-user.use-case';

@Injectable()
export class GetMyWalletOverviewUseCase {
  constructor(
    private readonly createWalletForUser: CreateWalletForUserUseCase,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly transactions: WalletTransactionRepositoryPort,
  ) {}

  async execute(userId: number, limit = 5) {
    const wallet = await this.createWalletForUser.execute(userId);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 5;
    const result = await this.transactions.findByWalletId(wallet.id!, 1, safeLimit);

    return {
      wallet,
      latestTransactions: result.data,
      totalTransactions: result.total,
      meta: {
        page: 1,
        limit: safeLimit,
      },
    };
  }
}
