import { CreditWalletFromValidatedExamUseCase } from '../../src/payment/wallet/use-cases/credit-wallet-from-validated-exam.use-case';
import { WalletStatus, FeeType } from '../../src/payment/shared/payment.enums';

const config = {
  getActive: async () => ({
    minimumWithdrawal: 500, maximumWithdrawal: 50000, withdrawFee: 0, withdrawFeeType: FeeType.FIXED,
    rewardPerExam: 250, currency: 'XOF', walletEnabled: true, withdrawEnabled: true, rewardEnabled: true,
    reviewDelayHours: 0, dailyWithdrawalLimit: 100000, monthlyWithdrawalLimit: 500000, kycThreshold: 0,
    minimumWalletBalance: 0, maxWithdrawPerDay: 1, maxWithdrawPerWeek: 3, maxWithdrawPerMonth: 10,
    automaticWithdrawal: false, maintenanceMode: false,
  }),
};

describe('CreditWalletFromValidatedExamUseCase', () => {
  it('crédite le wallet disponible quand une épreuve est validée', async () => {
    const walletStore: any = {};
    const wallets: any = {
      findByUserId: async () => null,
      createForUser: async (userId: number, currency: string) => walletStore.wallet = { id: 'w1', userId, balance: 0, availableBalance: 0, pendingBalance: 0, currency, status: WalletStatus.ACTIVE },
      updateBalances: async (wallet: any) => walletStore.wallet = wallet,
    };
    const transactions: any = { existsByReference: async () => false, create: async (d: any) => ({ id: 't1', ...d }) };
    const notifications: any = { notifyUser: async () => undefined };
    const audit: any = { log: async () => undefined };

    const useCase = new CreditWalletFromValidatedExamUseCase(wallets, transactions, config as any, notifications, audit);
    const result = await useCase.execute({ userId: 1, examId: 'exam-1', amount: 250 });

    expect(result.wallet.availableBalance).toBe(250);
    expect(result.duplicated).toBe(false);
  });
});
