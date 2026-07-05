import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  WALLET_REPOSITORY,
  WITHDRAWAL_OTP_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentNotificationPort,
  WalletRepositoryPort,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import { PaymentNotificationType, WithdrawalStatus } from '../../shared/payment.enums';
import { WithdrawalOtpStatus } from '../entities/withdrawal-otp.entity';
import { hashWithdrawalOtp } from '../otp.util';

@Injectable()
export class VerifyWithdrawalOtpUseCase {
  constructor(
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: number, withdrawalRequestId: string, code: string) {
    const withdrawal = await this.withdrawals.findById(withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException('Demande de retrait introuvable');
    if (withdrawal.status !== WithdrawalStatus.OTP_PENDING) throw new BadRequestException('Cette demande n’attend plus de validation OTP');

    const wallet = await this.wallets.findById(withdrawal.walletId);
    if (!wallet || wallet.userId !== userId) throw new ForbiddenException('Vous ne pouvez pas valider cette demande de retrait');

    const otp = await this.otps.findLatestByWithdrawalId(withdrawalRequestId);
    if (!otp) throw new NotFoundException('Aucun OTP trouvé pour cette demande');
    if (otp.status === WithdrawalOtpStatus.VERIFIED || otp.consumedAt) throw new BadRequestException('Ce code OTP a déjà été utilisé');
    if (otp.attemptCount >= otp.maxAttempts) throw new ForbiddenException('Nombre maximal de tentatives OTP atteint');
    if (otp.expiresAt.getTime() < Date.now()) {
      await this.otps.markExpired(otp.id);
      throw new BadRequestException('Le code OTP a expiré');
    }

    const otpSecret = this.config.get<string>('OTP_HASH_SECRET', this.config.get<string>('JWT_SECRET', 'edukia-wallet-lab-secret'));
    const hash = hashWithdrawalOtp(code, otpSecret);
    if (hash !== otp.codeHash) {
      await this.otps.incrementAttempt(otp.id);
      throw new BadRequestException('Code OTP incorrect');
    }

    await this.otps.markVerified(otp.id);
    const submitted = await this.withdrawals.markPending(withdrawalRequestId);
    const configuration = await this.configurations.getActive();

    await this.notifications.notifyUser({
      userId,
      title: 'Demande de retrait soumise',
      message: `Votre demande de retrait de ${submitted.amount} ${configuration.currency} est maintenant soumise et sera étudiée par l’administration EDUKIA.`,
      type: PaymentNotificationType.WITHDRAWAL_REQUESTED,
      metadata: { withdrawalRequestId: submitted.id },
    });

    await this.notifications.notifyAdmins({
      title: 'Nouvelle demande de retrait validée par OTP',
      message: `Un utilisateur a confirmé par OTP une demande de retrait de ${submitted.amount} ${configuration.currency}.`,
      type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
      metadata: { withdrawalRequestId: submitted.id, userId },
    });

    await this.audit.log({
      action: 'WITHDRAWAL_OTP_VERIFIED',
      entity: 'WithdrawalRequest',
      entityId: submitted.id,
      newValue: { userId, status: submitted.status },
    });

    return {
      ...submitted,
      message: 'Code OTP validé. La demande de retrait est maintenant soumise à l’administration.',
    };
  }
}
