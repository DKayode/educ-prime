import { ForbiddenException } from '@nestjs/common';
import { RequestWithdrawalUseCase } from '../../wallet-balance/use-cases/request-withdrawal.use-case';
import { RuleEngineService } from '../../shared/rules-engine.service';
import { FeeType, PaymentMethod, WalletStatus } from '../../shared/payment.enums';

const baseConfig = {
  minimumWithdrawal: 500, maximumWithdrawal: 50000, withdrawFee: 0, withdrawFeeType: FeeType.FIXED,
  rewardPerExam: 250, currency: 'XOF', walletEnabled: true, withdrawEnabled: true, rewardEnabled: true,
  reviewDelayHours: 0, dailyWithdrawalLimit: 100000, monthlyWithdrawalLimit: 500000, kycThreshold: 0,
  minimumWalletBalance: 0, maxWithdrawPerDay: 1, maxWithdrawPerWeek: 3, maxWithdrawPerMonth: 10,
  automaticWithdrawal: false, maintenanceMode: false,
};

function buildUseCase(overrides: Partial<{
  wallet: any;
  paymentAccount: any;
}> = {}) {
  const wallets: any = {
    findByUserId: async () => overrides.wallet ?? ({
      id: 'w1', userId: 1, balance: 3000, availableBalance: 3000, pendingBalance: 0, currency: 'XOF', status: WalletStatus.ACTIVE,
    }),
  };
  const restrictions: any = { findByUserId: async () => ({ userId: 1, canWithdraw: true, blocked: false }) };
  const withdrawals: any = { findOpenByWalletId: async () => null, sumPaidAmount: async () => 0, countPaid: async () => 0, create: async (d: any) => ({ id: 'wd1', ...d }) };
  const withdrawalOtps: any = { create: async (d: any) => ({ id: 'otp1', ...d, createdAt: new Date() }) };
  const accounts: any = { findDefaultByUserId: async () => overrides.paymentAccount ?? ({ id: 'acc1', userId: 1, phoneNumber: '+229 0161345578' }) };
  const config: any = { getActive: async () => baseConfig };
  const users: any = { getPaymentProfile: async () => ({ id: 1, isEmailVerified: true, isDisabled: false }) };
  const notifications: any = { notifyUser: async () => undefined, notifyAdmins: async () => undefined };
  const audit: any = { log: async () => undefined };
  const otpSender: any = { sendOtp: async () => ({ provider: 'console', messageId: null }) };
  const configService: any = { get: (_key: string, fallback?: string) => fallback };

  return new RequestWithdrawalUseCase(
    wallets,
    restrictions,
    withdrawals,
    withdrawalOtps,
    accounts,
    config,
    users,
    notifications,
    audit,
    otpSender,
    new RuleEngineService(),
    configService,
  );
}

describe('RequestWithdrawalUseCase', () => {
  it('refuse un retrait supérieur au solde disponible', async () => {
    const uc = buildUseCase({
      wallet: { id: 'w1', userId: 1, balance: 300, availableBalance: 300, pendingBalance: 0, currency: 'XOF', status: WalletStatus.ACTIVE },
    });

    await expect(uc.execute({ userId: 1, amount: 1000, paymentMethod: PaymentMethod.MOBILE_MONEY, paymentAccountId: 'acc1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse une demande de retrait si le compte Mobile Money n’est pas au format béninois +229 01XXXXXXXX', async () => {
    const uc = buildUseCase({
      paymentAccount: { id: 'acc1', userId: 1, phoneNumber: '+22961345578' },
    });

    await expect(uc.execute({ userId: 1, amount: 1000, paymentMethod: PaymentMethod.MOBILE_MONEY, paymentAccountId: 'acc1' }))
      .rejects.toMatchObject({
        response: expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ code: 'BENIN_PAYMENT_ACCOUNT_PHONE' })]),
        }),
      });
  });
});
