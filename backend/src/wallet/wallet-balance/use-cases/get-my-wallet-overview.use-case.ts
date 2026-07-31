import { Inject, Injectable } from '@nestjs/common';
import { WITHDRAWAL_REQUEST_REPOSITORY } from '../../shared/payment.tokens';
import { WithdrawalRequestRepositoryPort } from '../../shared/payment.ports';
import { CreateWalletForUserUseCase } from './create-wallet-for-user.use-case';

@Injectable()
export class GetMyWalletOverviewUseCase {
  constructor(
    private readonly createWalletForUser: CreateWalletForUserUseCase,
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY)
    private readonly withdrawals: WithdrawalRequestRepositoryPort,
  ) {}

  async execute(userId: number, limit = 5) {
    const wallet = await this.createWalletForUser.execute(userId);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 5;

    const result = await this.withdrawals.findWalletActivityHistory(wallet.id!, 1, safeLimit);

    return {
      wallet,
      latestActivity: result.data,
      totalActivityItems: result.total,
      meta: {
        page: 1,
        limit: safeLimit,
        note: 'Vue mobile : wallet + dernières étapes financières/retrait/OTP/paiement.',
      },
    };
  }
}
