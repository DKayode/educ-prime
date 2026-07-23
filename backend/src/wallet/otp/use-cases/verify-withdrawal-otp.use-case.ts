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
  WithdrawalOtpModel,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import { OtpDeliveryStatus, PaymentNotificationType, WithdrawalStatus } from '../../shared/payment.enums';
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
  ) { }

  async execute(userId: number, withdrawalRequestId: string, code: string) {
    const withdrawal = await this.withdrawals.findById(withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException('Demande de retrait introuvable');
    if (withdrawal.status === WithdrawalStatus.SECURITY_REVIEW_REQUIRED) {
      throw new ForbiddenException('Cette demande est bloquée pour vérification de sécurité. Un administrateur doit la débloquer.');
    }
    if (withdrawal.status !== WithdrawalStatus.OTP_PENDING) throw new BadRequestException('Cette demande n’attend plus de validation OTP');

    const wallet = await this.wallets.findById(withdrawal.walletId);
    if (!wallet || wallet.userId !== userId) throw new ForbiddenException('Vous ne pouvez pas valider cette demande de retrait');

    const otp = await this.otps.findLatestByWithdrawalId(withdrawalRequestId);
    if (!otp) throw new NotFoundException('Aucun OTP trouvé pour cette demande');
    if (otp.status === WithdrawalOtpStatus.LOCKED) throw new ForbiddenException('Ce code OTP est bloqué. Une vérification administrateur est requise.');
    if (otp.status === WithdrawalOtpStatus.VERIFIED || otp.consumedAt) throw new BadRequestException('Ce code OTP a déjà été utilisé');
    if (otp.status === WithdrawalOtpStatus.FAILED) throw new BadRequestException('Ce code OTP n’est plus valide car son envoi ou sa livraison a échoué. Veuillez demander un nouveau code.');
    if (otp.status !== WithdrawalOtpStatus.SENT) throw new BadRequestException('Ce code OTP n’est plus actif. Veuillez demander un nouveau code.');
    if ([OtpDeliveryStatus.UNDELIVERED, OtpDeliveryStatus.FAILED, OtpDeliveryStatus.DELIVERY_TIMEOUT].includes(otp.deliveryStatus as OtpDeliveryStatus)) {
      throw new BadRequestException('Ce code OTP n’a pas pu être livré. Veuillez demander un nouveau code.');
    }
    if (otp.attemptCount >= otp.maxAttempts) {
      await this.lockForSecurityReview(userId, withdrawalRequestId, otp, 'Nombre maximal de tentatives OTP atteint');
      throw new ForbiddenException('Nombre maximal de tentatives OTP atteint. La demande nécessite une vérification administrateur.');
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      await this.otps.markExpired(otp.id);
      throw new BadRequestException('Le code OTP a expiré');
    }

    const otpSecret = this.config.get<string>('OTP_HASH_SECRET', this.config.get<string>('JWT_SECRET', 'edukia-wallet-lab-secret'));
    const hash = hashWithdrawalOtp(code, otpSecret);
    if (hash !== otp.codeHash) {
      const updatedOtp = await this.otps.incrementAttempt(otp.id);
      if (updatedOtp.attemptCount >= updatedOtp.maxAttempts) {
        await this.lockForSecurityReview(userId, withdrawalRequestId, updatedOtp, 'Nombre maximal de tentatives OTP atteint');
        throw new ForbiddenException('Nombre maximal de tentatives OTP atteint. La demande nécessite une vérification administrateur.');
      }
      throw new BadRequestException(`Code OTP incorrect. Tentative ${updatedOtp.attemptCount}/${updatedOtp.maxAttempts}.`);
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

  private async lockForSecurityReview(userId: number, withdrawalRequestId: string, otp: WithdrawalOtpModel, reason: string) {
    const configuration = await this.configurations.getActive();
    await this.otps.markLocked(otp.id, reason);
    const lockedWithdrawal = await this.withdrawals.markSecurityReviewRequired(withdrawalRequestId, reason);

    await this.notifications.notifyUser({
      userId,
      title: 'Vérification de sécurité requise',
      message: 'Votre demande de retrait nécessite une vérification de sécurité par l’équipe EDUKIA avant une nouvelle tentative.',
      type: PaymentNotificationType.WITHDRAWAL_OTP_LOCKED,
      metadata: { withdrawalRequestId, reason, lockDurationMinutes: configuration.otpLockDurationMinutes },
    });

    await this.notifications.notifyAdmins({
      title: 'Demande de retrait bloquée par sécurité OTP',
      message: `Une demande de retrait nécessite une vérification administrateur après atteinte du nombre maximal de tentatives OTP.`,
      type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
      metadata: { withdrawalRequestId, userId, reason, status: lockedWithdrawal.status },
    });

    await this.audit.log({
      action: 'WITHDRAWAL_OTP_SECURITY_REVIEW_REQUIRED',
      entity: 'WithdrawalRequest',
      entityId: withdrawalRequestId,
      newValue: { userId, reason, status: WithdrawalStatus.SECURITY_REVIEW_REQUIRED, attemptCount: otp.attemptCount, maxAttempts: otp.maxAttempts },
    });
  }
}
