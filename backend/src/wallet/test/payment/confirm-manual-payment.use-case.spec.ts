import { BadRequestException } from '@nestjs/common';
import { ConfirmManualPaymentUseCase } from '../../user-payment/use-cases/admin-withdrawal.use-cases';
import { MobileMoneyProvider, PaymentMethod, WalletStatus, WithdrawalStatus } from '../../shared/payment.enums';

function buildUseCase() {
  let wallet = { id: 'w1', userId: 1, balance: 2000, availableBalance: 2000, pendingBalance: 0, currency: 'XOF', status: WalletStatus.ACTIVE };
  const withdrawals: any = {
    findById: async () => ({ id: 'wd1', walletId: 'w1', amount: 1000, status: WithdrawalStatus.APPROVED, paymentMethod: PaymentMethod.MOBILE_MONEY }),
    markPaid: async () => ({ id: 'wd1', status: WithdrawalStatus.PAID }),
  };
  const executions: any = { existsByTransactionReference: async () => false, create: async (data: any) => ({ id: 'pe1', createdAt: new Date(), ...data }) };
  const wallets: any = { findById: async () => wallet, updateBalances: async (w: any) => wallet = w };
  const transactions: any = { create: async (d: any) => ({ id: 'tx1', ...d }) };
  const notifications: any = { notifyUser: async () => undefined };
  const audit: any = { log: async () => undefined };

  return new ConfirmManualPaymentUseCase(withdrawals, executions, wallets, transactions, notifications, audit);
}

describe('ConfirmManualPaymentUseCase', () => {
  it('débite le wallet après confirmation admin', async () => {
    const uc = buildUseCase();
    const result = await uc.execute({
      withdrawalRequestId: 'wd1',
      adminId: 99,
      provider: MobileMoneyProvider.MTN_MOMO,
      transactionReference: 'MM001',
      phoneNumber: '+229 0161345578',
      paidAmount: 1000,
    });

    expect(result.wallet.availableBalance).toBe(1000);
    expect((result.execution as any).phoneNumber).toBe('+229 0161345578');
  });

  it('refuse la confirmation admin si le numéro ne respecte pas +229 01XXXXXXXX', async () => {
    const uc = buildUseCase();

    await expect(uc.execute({
      withdrawalRequestId: 'wd1',
      adminId: 99,
      provider: MobileMoneyProvider.MTN_MOMO,
      transactionReference: 'MM002',
      phoneNumber: '+22961345578',
      paidAmount: 1000,
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
