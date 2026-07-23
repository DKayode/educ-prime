import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  WALLET_REPOSITORY,
  WITHDRAWAL_OTP_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  WalletRepositoryPort,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';

@Injectable()
export class GetCurrentWithdrawalUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
  ) {}

  async execute(userId: number) {
    const wallet = await this.wallets.findByUserId(userId);
    if (!wallet) throw new NotFoundException('Wallet introuvable');

    const withdrawal = await this.withdrawals.findOpenByWalletId(wallet.id!);
    if (!withdrawal) {
      return {
        hasCurrentWithdrawal: false,
        withdrawal: null,
        otp: null,
        message: 'Aucune demande de retrait courante.',
      };
    }

    const latestOtp = await this.otps.findLatestByWithdrawalId(withdrawal.id);

    return {
      hasCurrentWithdrawal: true,
      withdrawal: {
        id: withdrawal.id,
        walletId: withdrawal.walletId,
        amount: withdrawal.amount,
        fees: withdrawal.fees,
        netAmount: withdrawal.netAmount,
        status: withdrawal.status,
        securityStatus: withdrawal.securityStatus ?? null,
        securityReviewReason: withdrawal.securityReviewReason ?? null,
        securityReviewedBy: withdrawal.securityReviewedBy ?? null,
        securityReviewedAt: withdrawal.securityReviewedAt ?? null,
        otpLockedAt: withdrawal.otpLockedAt ?? null,
        otpUnlockedAt: withdrawal.otpUnlockedAt ?? null,
        paymentMethod: withdrawal.paymentMethod,
        paymentAccountId: withdrawal.paymentAccountId ?? null,
        paymentDeadline: withdrawal.paymentDeadline ?? null,
        createdAt: withdrawal.createdAt,
      },
      otp: latestOtp ? {
        id: latestOtp.id,
        status: latestOtp.status,
        deliveryStatus: latestOtp.deliveryStatus ?? null,
        attemptCount: latestOtp.attemptCount,
        maxAttempts: latestOtp.maxAttempts,
        resendCount: latestOtp.resendCount ?? 0,
        expiresAt: latestOtp.expiresAt,
        consumedAt: latestOtp.consumedAt ?? null,
        lockedAt: latestOtp.lockedAt ?? null,
        lockedReason: latestOtp.lockedReason ?? null,
        deliveredAt: latestOtp.deliveredAt ?? null,
        failedAt: latestOtp.failedAt ?? null,
        failureReason: latestOtp.failureReason ?? null,
        provider: latestOtp.provider,
      } : null,
    };
  }
}
