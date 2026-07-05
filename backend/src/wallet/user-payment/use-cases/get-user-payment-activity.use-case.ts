import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_EXECUTION_REPOSITORY,
  USER_PAYMENT_ACCOUNT_REPOSITORY,
  USER_PROFILE_PORT,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentExecutionRepositoryPort,
  UserPaymentAccountRepositoryPort,
  UserProfilePort,
  WalletRepositoryPort,
  WalletTransactionRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import { WalletTransactionType } from '../../shared/payment.enums';

@Injectable()
export class GetUserPaymentActivityUseCase {
  constructor(
    @Inject(USER_PROFILE_PORT) private readonly users: UserProfilePort,
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(USER_PAYMENT_ACCOUNT_REPOSITORY) private readonly accounts: UserPaymentAccountRepositoryPort,
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(PAYMENT_EXECUTION_REPOSITORY) private readonly executions: PaymentExecutionRepositoryPort,
    @Inject(WALLET_TRANSACTION_REPOSITORY) private readonly transactions: WalletTransactionRepositoryPort,
  ) {}

  async execute(userId: number, page = 1, limit = 50) {
    const user = await this.users.getPaymentProfile(userId);
    const wallet = await this.wallets.findByUserId(userId);
    if (!wallet) throw new NotFoundException('Wallet introuvable pour cet utilisateur');

    const [paymentAccounts, withdrawalResult, transactionResult, withdrawalStats, totalRewards, totalWithdrawTransactions] = await Promise.all([
      this.accounts.findByUserId(userId),
      this.withdrawals.findWithPaymentDetailsByUserId(userId, page, limit),
      this.transactions.findByWalletIdForAdmin(wallet.id!, page, limit),
      this.withdrawals.getStatisticsByWalletId(wallet.id!),
      this.transactions.sumByType(wallet.id!, WalletTransactionType.REWARD),
      this.transactions.sumByType(wallet.id!, WalletTransactionType.WITHDRAW),
    ]);

    const paymentExecutions = await this.executions.findByWithdrawalIds(withdrawalResult.data.map((item) => item.id));

    return {
      user,
      wallet,
      paymentAccounts,
      statistics: {
        wallet: {
          balance: wallet.balance,
          availableBalance: wallet.availableBalance,
          pendingBalance: wallet.pendingBalance,
          currency: wallet.currency,
          status: wallet.status,
        },
        withdrawals: withdrawalStats,
        transactions: {
          totalRewards,
          totalWithdrawTransactions,
          transactionCount: transactionResult.total,
        },
      },
      withdrawals: {
        data: withdrawalResult.data,
        total: withdrawalResult.total,
        page,
        limit,
      },
      paymentExecutions,
      walletTransactions: {
        data: transactionResult.data,
        total: transactionResult.total,
        page,
        limit,
      },
    };
  }
}
