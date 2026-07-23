import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OTP_SMS_SENDER_PORT,
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  WALLET_REPOSITORY,
  WITHDRAWAL_OTP_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  OtpSmsSenderPort,
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentNotificationPort,
  WalletRepositoryPort,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import { OtpDeliveryStatus, PaymentNotificationType, WithdrawalStatus } from '../../shared/payment.enums';
import { generateNumericOtp, hashWithdrawalOtp } from '../otp.util';
import { WithdrawalOtpStatus } from '../entities/withdrawal-otp.entity';

@Injectable()
export class ResendWithdrawalOtpUseCase {
  constructor(
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
    @Inject(OTP_SMS_SENDER_PORT) private readonly otpSender: OtpSmsSenderPort,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: number, withdrawalRequestId: string) {
    const withdrawal = await this.withdrawals.findById(withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException('Demande de retrait introuvable');
    if (withdrawal.status === WithdrawalStatus.SECURITY_REVIEW_REQUIRED) {
      throw new ForbiddenException('Cette demande nécessite une vérification administrateur avant tout renvoi OTP.');
    }
    if (withdrawal.status !== WithdrawalStatus.OTP_PENDING) {
      throw new BadRequestException('Cette demande n’attend plus de validation OTP');
    }

    const wallet = await this.wallets.findById(withdrawal.walletId);
    if (!wallet || wallet.userId !== userId) throw new ForbiddenException('Vous ne pouvez pas demander un renvoi OTP pour cette demande');

    const latestOtp = await this.otps.findLatestByWithdrawalId(withdrawalRequestId);
    if (!latestOtp) throw new NotFoundException('Aucun OTP trouvé pour cette demande');

    const configuration = await this.configurations.getActive();
    const cooldownSeconds = Number(configuration.otpResendCooldownSeconds || this.config.get<string>('OTP_RESEND_COOLDOWN_SECONDS', '60'));
    const maxResends = Number(configuration.otpMaxResends || this.config.get<string>('OTP_MAX_RESENDS', '2'));
    const resendCount = Number(latestOtp.resendCount ?? 0);

    if (resendCount >= maxResends) {
      await this.otps.markLocked(latestOtp.id, 'Nombre maximal de renvois OTP atteint');
      await this.withdrawals.markSecurityReviewRequired(withdrawalRequestId, 'Nombre maximal de renvois OTP atteint');
      await this.notifications.notifyAdmins({
        title: 'Demande de retrait bloquée après renvois OTP',
        message: 'Une demande de retrait nécessite une vérification de sécurité après plusieurs renvois OTP.',
        type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
        metadata: { withdrawalRequestId, userId, resendCount, maxResends },
      });
      throw new ForbiddenException('Le nombre maximal de renvois OTP est atteint. Une vérification administrateur est nécessaire.');
    }

    if (latestOtp.lastSentAt) {
      const nextAllowedAt = latestOtp.lastSentAt.getTime() + cooldownSeconds * 1000;
      if (Date.now() < nextAllowedAt) {
        throw new BadRequestException(`Veuillez patienter ${Math.ceil((nextAllowedAt - Date.now()) / 1000)} secondes avant de demander un nouveau code.`);
      }
    }

    await this.otps.incrementResend(latestOtp.id);
    await this.otps.expireActiveByWithdrawalId(withdrawalRequestId);

    const now = new Date();
    const otpLength = Number(configuration.otpLength || this.config.get<string>('OTP_LENGTH', '6'));
    const otpTtlMinutes = Number(configuration.otpTtlMinutes || this.config.get<string>('OTP_TTL_MINUTES', '10'));
    const maxAttempts = Number(configuration.otpMaxAttempts || this.config.get<string>('OTP_MAX_ATTEMPTS', '3'));
    const debugEnabled = this.config.get<string>('OTP_DEBUG_ENABLED', 'true') === 'true' && this.config.get<string>('NODE_ENV', process.env.NODE_ENV || 'development') !== 'production';
    const otpSecret = this.config.get<string>('OTP_HASH_SECRET', this.config.get<string>('JWT_SECRET', 'edukia-wallet-lab-secret'));
    const code = generateNumericOtp(otpLength);
    const expiresAt = new Date(now.getTime() + otpTtlMinutes * 60 * 1000);
    const provider = String(configuration.otpProvider || latestOtp.provider || this.config.get<string>('OTP_SMS_PROVIDER', 'console')).toLowerCase();
    const message = `EDUKIA : votre nouveau code de validation retrait est ${code}. Il expire dans ${otpTtlMinutes} minutes.`;

    let finalProvider = provider;
    let providerMessageId: string | null | undefined = null;
    let providerBulkId: string | null | undefined = null;
    let failureReason: string | null = null;
    let status = WithdrawalOtpStatus.SENT;
    let deliveryStatus = provider === 'infobip' ? OtpDeliveryStatus.CREATED : OtpDeliveryStatus.NOT_REQUIRED;

    try {
      const result = await this.otpSender.sendOtp({
        phoneNumber: latestOtp.phoneNumber,
        code,
        message,
        provider,
        withdrawalRequestId,
        userId,
      });
      finalProvider = result.provider || finalProvider;
      providerMessageId = result.messageId;
      providerBulkId = result.bulkId;
      deliveryStatus = result.deliveryStatus ?? (finalProvider === 'infobip' ? OtpDeliveryStatus.SENT_TO_PROVIDER : OtpDeliveryStatus.NOT_REQUIRED);
    } catch (error) {
      status = WithdrawalOtpStatus.FAILED;
      deliveryStatus = OtpDeliveryStatus.FAILED;
      failureReason = error instanceof Error ? error.message : 'Erreur inconnue pendant le renvoi OTP';
    }

    const nextDeliveryCheckAt = deliveryStatus === OtpDeliveryStatus.SENT_TO_PROVIDER
      ? new Date(now.getTime() + Number(this.config.get<string>('OTP_DELIVERY_UNKNOWN_AFTER_SECONDS', '120')) * 1000)
      : null;

    const otp = await this.otps.create({
      withdrawalRequestId,
      userId,
      phoneNumber: latestOtp.phoneNumber,
      codeHash: hashWithdrawalOtp(code, otpSecret),
      debugCode: debugEnabled ? code : null,
      expiresAt,
      maxAttempts,
      provider: finalProvider,
      providerMessageId,
      providerBulkId,
      failureReason,
      status,
      deliveryStatus,
      nextDeliveryCheckAt,
      resendCount: resendCount + 1,
    });

    await this.notifications.notifyUser({
      userId,
      title: 'Nouveau code OTP envoyé',
      message: 'Un nouveau code OTP est en cours d’envoi sur votre numéro Mobile Money.',
      type: PaymentNotificationType.WITHDRAWAL_OTP_RESENT,
      metadata: { withdrawalRequestId, otpId: otp.id, deliveryStatus, resendCount: resendCount + 1 },
    });

    await this.audit.log({
      action: 'WITHDRAWAL_OTP_RESENT',
      entity: 'WithdrawalRequest',
      entityId: withdrawalRequestId,
      newValue: { userId, provider: finalProvider, deliveryStatus, resendCount: resendCount + 1, failureReason },
    });

    return {
      message: status === WithdrawalOtpStatus.SENT
        ? 'Un nouveau code OTP est en cours d’envoi.'
        : 'Le renvoi OTP a échoué. Veuillez réessayer plus tard ou contacter le support.',
      otp: {
        id: otp.id,
        provider: finalProvider,
        deliveryStatus,
        expiresAt,
        debugAvailable: debugEnabled,
        resendCount: resendCount + 1,
        maxResends,
        failureReason,
      },
    };
  }
}
