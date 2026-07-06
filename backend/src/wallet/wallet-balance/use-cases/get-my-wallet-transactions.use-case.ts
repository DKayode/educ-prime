import { Inject, Injectable } from '@nestjs/common';
import { WALLET_TRANSACTION_REPOSITORY } from '../../shared/payment.tokens';
import { WalletTransactionRepositoryPort } from '../../shared/payment.ports';
import { CreateWalletForUserUseCase } from './create-wallet-for-user.use-case';

/**
 * Dedicated paginated transaction history for the connected user's wallet.
 * `GET /wallet/me` already returns the wallet + a first page of transactions;
 * this endpoint serves a standalone, paginated history screen ({ data, meta }).
 */
@Injectable()
export class GetMyWalletTransactionsUseCase {
  constructor(
    private readonly createWalletForUser: CreateWalletForUserUseCase,
    @Inject(WALLET_TRANSACTION_REPOSITORY)
    private readonly transactions: WalletTransactionRepositoryPort,
  ) {}

  async execute(userId: number, page = 1, limit = 20) {
    const wallet = await this.createWalletForUser.execute(userId);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const result = await this.transactions.findByWalletId(wallet.id!, safePage, safeLimit);

    return {
      data: result.data,
      meta: { page: safePage, limit: safeLimit, total: result.total },
    };
  }
}
