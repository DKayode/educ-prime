import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OTP_SMS_SENDER_PORT,
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_EXECUTION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  WITHDRAWAL_OTP_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  OtpSmsSenderPort,
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentExecutionRepositoryPort,
  PaymentNotificationPort,
  WalletRepositoryPort,
  WalletTransactionRepositoryPort,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import {
  OtpDeliveryStatus,
  MobileMoneyProvider,
  PaymentExecutionStatus,
  PaymentMethod,
  PaymentNotificationType,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalStatus,
} from '../../shared/payment.enums';
import { WalletAggregate } from '../../wallet-balance/domain/wallet.aggregate';
import { BENIN_MOBILE_MONEY_PHONE_ERROR_MESSAGE, normalizeBeninMobileMoneyPhone } from '../../shared/benin-phone-number.util';
import { generateNumericOtp, hashWithdrawalOtp } from '../../otp/otp.util';
import { WithdrawalOtpStatus } from '../../otp/entities/withdrawal-otp.entity';

@Injectable()
export class ListAdminWithdrawalsUseCase {
  constructor(@Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort) {}
  execute(status?: WithdrawalStatus, page = 1, limit = 20) { return this.withdrawals.findForAdmin(status, page, limit); }
}


@Injectable()
export class GetWithdrawalOtpDeliveryStatusUseCase {
  constructor(
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
  ) {}

  async execute(withdrawalRequestId: string) {
    const withdrawal = await this.withdrawals.findById(withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException('Demande de retrait introuvable');

    const wallet = await this.wallets.findById(withdrawal.walletId);
    if (!wallet) throw new NotFoundException('Wallet introuvable');

    const otp = await this.otps.findLatestByWithdrawalId(withdrawal.id);

    const diagnostic = this.buildDiagnostic(otp);

    return {
      withdrawalRequestId: withdrawal.id,
      walletId: withdrawal.walletId,
      userId: wallet.userId,
      withdrawal: {
        amount: withdrawal.amount,
        fees: withdrawal.fees,
        netAmount: withdrawal.netAmount,
        status: withdrawal.status,
        securityStatus: withdrawal.securityStatus ?? null,
        securityReviewReason: withdrawal.securityReviewReason ?? null,
        paymentDeadline: withdrawal.paymentDeadline ?? null,
        createdAt: withdrawal.createdAt,
      },
      otp: otp ? {
        id: otp.id,
        status: otp.status,
        provider: otp.provider,
        phoneNumber: this.maskPhoneNumber(otp.phoneNumber),
        providerMessageId: otp.providerMessageId ?? null,
        providerBulkId: otp.providerBulkId ?? null,
        deliveryStatus: otp.deliveryStatus ?? null,
        providerStatusName: otp.providerStatusName ?? null,
        providerStatusGroupName: otp.providerStatusGroupName ?? null,
        providerStatusDescription: otp.providerStatusDescription ?? null,
        deliveryErrorCode: otp.deliveryErrorCode ?? null,
        deliveryErrorMessage: otp.deliveryErrorMessage ?? null,
        failureReason: otp.failureReason ?? null,
        sentAt: otp.lastSentAt ?? null,
        deliveredAt: otp.deliveredAt ?? null,
        failedAt: otp.failedAt ?? null,
        lastProviderCallbackAt: otp.lastProviderCallbackAt ?? null,
        deliveryCheckCount: otp.deliveryCheckCount ?? 0,
        nextDeliveryCheckAt: otp.nextDeliveryCheckAt ?? null,
        attemptCount: otp.attemptCount,
        maxAttempts: otp.maxAttempts,
        resendCount: otp.resendCount ?? 0,
        expiresAt: otp.expiresAt,
        lockedAt: otp.lockedAt ?? null,
        lockedReason: otp.lockedReason ?? null,
        unlockedAt: otp.unlockedAt ?? null,
        unlockedBy: otp.unlockedBy ?? null,
      } : null,
      diagnostic,
    };
  }

  private buildDiagnostic(otp: any): {
    level: 'OK' | 'INFO' | 'WARNING' | 'ERROR';
    code: string;
    message: string;
  } {
    if (!otp) {
      return {
        level: 'WARNING',
        code: 'OTP_NOT_FOUND',
        message: 'Aucun OTP n’a été trouvé pour cette demande de retrait.',
      };
    }

    if (otp.provider !== 'infobip') {
      return {
        level: 'INFO',
        code: 'NON_INFOBIP_PROVIDER',
        message: `Le dernier OTP utilise le fournisseur ${otp.provider}. Aucun statut de livraison Infobip n’est attendu.`,
      };
    }

    if (!otp.providerMessageId) {
      return {
        level: 'ERROR',
        code: 'INFOBIP_NOT_ACCEPTED',
        message: 'Infobip n’a pas retourné de messageId. Vérifier les variables INFOBIP, le sender, le format du numéro et les logs serveur.',
      };
    }

    if (otp.deliveryStatus === OtpDeliveryStatus.DELIVERED) {
      return {
        level: 'OK',
        code: 'OTP_DELIVERED',
        message: 'Infobip indique que le SMS OTP a été livré.',
      };
    }

    if ([OtpDeliveryStatus.UNDELIVERED, OtpDeliveryStatus.FAILED, OtpDeliveryStatus.DELIVERY_TIMEOUT].includes(otp.deliveryStatus)) {
      return {
        level: 'ERROR',
        code: 'OTP_NOT_DELIVERED',
        message: 'Infobip a retourné un statut indiquant que le SMS OTP n’a pas été livré.',
      };
    }

    if ([OtpDeliveryStatus.SENT_TO_PROVIDER, OtpDeliveryStatus.DELIVERY_UNKNOWN, OtpDeliveryStatus.CREATED].includes(otp.deliveryStatus)) {
      return {
        level: 'WARNING',
        code: 'OTP_DELIVERY_PENDING_OR_UNKNOWN',
        message: 'Le SMS OTP a été envoyé à Infobip, mais la livraison finale n’est pas encore confirmée.',
      };
    }

    return {
      level: 'INFO',
      code: 'OTP_STATUS_UNSPECIFIED',
      message: 'Statut OTP disponible, mais diagnostic automatique non déterminé.',
    };
  }

  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 6) return '***';
    return `${phoneNumber.slice(0, 4)}****${phoneNumber.slice(-3)}`;
  }
}

@Injectable()
export class ApproveWithdrawalUseCase {
  constructor(
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(id: string, adminId: number) {
    const withdrawal = await this.withdrawals.approve(id, adminId);
    await this.audit.log({ adminId, action: 'WITHDRAWAL_APPROVED', entity: 'WithdrawalRequest', entityId: id });
    return withdrawal;
  }
}

@Injectable()
export class RejectWithdrawalUseCase {
  constructor(
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(id: string, adminId: number, reason: string) {
    const withdrawal = await this.withdrawals.reject(id, adminId, reason);
    await this.audit.log({ adminId, action: 'WITHDRAWAL_REJECTED', entity: 'WithdrawalRequest', entityId: id, newValue: { reason } });
    return withdrawal;
  }
}

@Injectable()
export class UnlockWithdrawalOtpUseCase {
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

  async execute(command: {
    withdrawalRequestId: string;
    adminId: number;
    reason: string;
    verificationMethod?: string;
    allowNewOtp?: boolean;
  }) {
    const withdrawal = await this.withdrawals.findById(command.withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException('Demande de retrait introuvable');
    if (withdrawal.status !== WithdrawalStatus.SECURITY_REVIEW_REQUIRED) {
      throw new BadRequestException('Cette demande ne nécessite pas de déblocage OTP');
    }

    const wallet = await this.wallets.findById(withdrawal.walletId);
    if (!wallet) throw new NotFoundException('Wallet introuvable');

    const latestOtp = await this.otps.findLatestByWithdrawalId(withdrawal.id);
    if (!latestOtp) throw new NotFoundException('Aucun OTP trouvé pour cette demande');

    const configuration = await this.configurations.getActive();
    const unlockReason = `${command.reason}${command.verificationMethod ? ` | Méthode: ${command.verificationMethod}` : ''}`;

    await this.otps.markUnlocked(latestOtp.id, command.adminId, unlockReason);
    await this.otps.expireActiveByWithdrawalId(withdrawal.id);
    const unlockedWithdrawal = await this.withdrawals.unlockOtpSecurityReview(withdrawal.id, command.adminId, unlockReason);

    let newOtp: Record<string, unknown> | null = null;
    const shouldSendNewOtp = command.allowNewOtp !== false;
    if (shouldSendNewOtp) {
      const now = new Date();
      const otpLength = Number(configuration.otpLength || this.config.get<string>('OTP_LENGTH', '6'));
      const otpTtlMinutes = Number(configuration.otpTtlMinutes || this.config.get<string>('OTP_TTL_MINUTES', '10'));
      const maxAttempts = Number(configuration.otpMaxAttempts || this.config.get<string>('OTP_MAX_ATTEMPTS', '3'));
      const debugEnabled = this.config.get<string>('OTP_DEBUG_ENABLED', 'true') === 'true' && this.config.get<string>('NODE_ENV', process.env.NODE_ENV || 'development') !== 'production';
      const otpSecret = this.config.get<string>('OTP_HASH_SECRET', this.config.get<string>('JWT_SECRET', 'edukia-wallet-lab-secret'));
      const code = generateNumericOtp(otpLength);
      const expiresAt = new Date(now.getTime() + otpTtlMinutes * 60 * 1000);
      const message = `EDUKIA : votre nouveau code de validation retrait est ${code}. Il expire dans ${otpTtlMinutes} minutes.`;

      let provider = configuration.otpProvider || latestOtp.provider || 'console';
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
          withdrawalRequestId: withdrawal.id,
          userId: wallet.userId,
        });
        provider = result.provider || provider;
        providerMessageId = result.messageId;
        providerBulkId = result.bulkId;
        deliveryStatus = result.deliveryStatus ?? (provider === 'infobip' ? OtpDeliveryStatus.SENT_TO_PROVIDER : OtpDeliveryStatus.NOT_REQUIRED);
      } catch (error) {
        status = WithdrawalOtpStatus.FAILED;
        deliveryStatus = OtpDeliveryStatus.FAILED;
        failureReason = error instanceof Error ? error.message : 'Erreur inconnue pendant l’envoi OTP';
      }

      const nextDeliveryCheckAt = deliveryStatus === OtpDeliveryStatus.SENT_TO_PROVIDER
        ? new Date(now.getTime() + Number(this.config.get<string>('OTP_DELIVERY_UNKNOWN_AFTER_SECONDS', '120')) * 1000)
        : null;

      const createdOtp = await this.otps.create({
        withdrawalRequestId: withdrawal.id,
        userId: wallet.userId,
        phoneNumber: latestOtp.phoneNumber,
        codeHash: hashWithdrawalOtp(code, otpSecret),
        debugCode: debugEnabled ? code : null,
        expiresAt,
        maxAttempts,
        provider,
        providerMessageId,
        providerBulkId,
        failureReason,
        status,
        deliveryStatus,
        nextDeliveryCheckAt,
      });

      newOtp = {
        id: createdOtp.id,
        sent: status === WithdrawalOtpStatus.SENT,
        provider,
        deliveryStatus,
        expiresAt,
        debugAvailable: debugEnabled,
        failureReason,
      };
    }

    await this.notifications.notifyUser({
      userId: wallet.userId,
      title: 'Demande de retrait débloquée',
      message: shouldSendNewOtp
        ? 'Votre demande de retrait a été vérifiée. Un nouveau code OTP vous a été envoyé.'
        : 'Votre demande de retrait a été débloquée par l’administration EDUKIA.',
      type: PaymentNotificationType.WITHDRAWAL_OTP_UNLOCKED,
      metadata: { withdrawalRequestId: withdrawal.id, newOtp },
    });

    await this.audit.log({
      adminId: command.adminId,
      action: 'WITHDRAWAL_OTP_UNLOCKED_BY_ADMIN',
      entity: 'WithdrawalRequest',
      entityId: withdrawal.id,
      newValue: { reason: command.reason, verificationMethod: command.verificationMethod, allowNewOtp: shouldSendNewOtp, newOtp },
    });

    return {
      withdrawal: unlockedWithdrawal,
      otp: newOtp,
      message: shouldSendNewOtp
        ? 'Demande débloquée et nouvel OTP généré.'
        : 'Demande débloquée. Aucun nouvel OTP n’a été envoyé.',
    };
  }
}

@Injectable()
export class ConfirmManualPaymentUseCase {
  constructor(
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(PAYMENT_EXECUTION_REPOSITORY) private readonly executions: PaymentExecutionRepositoryPort,
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(WALLET_TRANSACTION_REPOSITORY) private readonly transactions: WalletTransactionRepositoryPort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(command: {
    withdrawalRequestId: string;
    adminId: number;
    provider: MobileMoneyProvider;
    transactionReference: string;
    phoneNumber: string;
    paidAmount: number;
    paidAt?: Date;
    comment?: string | null;
    internalNote?: string | null;
    proof?: { fileName: string; fileUrl: string; mimeType: string; uploadedBy: number };
  }) {
    const normalizedPhoneNumber = normalizeBeninMobileMoneyPhone(command.phoneNumber);
    if (!normalizedPhoneNumber) {
      throw new BadRequestException(BENIN_MOBILE_MONEY_PHONE_ERROR_MESSAGE);
    }

    if (await this.executions.existsByTransactionReference(command.transactionReference)) {
      throw new ConflictException('Cette référence de paiement existe déjà');
    }

    const withdrawal = await this.withdrawals.findById(command.withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException('Demande de retrait introuvable');
    if (![WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING].includes(withdrawal.status)) {
      throw new ConflictException('Cette demande ne peut plus être payée');
    }

    const wallet = await this.wallets.findById(withdrawal.walletId);
    if (!wallet) throw new NotFoundException('Wallet introuvable');

    const before = wallet.balance;
    const aggregate = WalletAggregate.from(wallet);
    aggregate.debitAvailable(withdrawal.amount);
    const savedWallet = await this.wallets.updateBalances(aggregate.value);

    const execution = await this.executions.create({
      withdrawalRequestId: withdrawal.id,
      executedBy: command.adminId,
      paymentMethod: PaymentMethod.MOBILE_MONEY,
      provider: command.provider,
      transactionReference: command.transactionReference,
      phoneNumber: normalizedPhoneNumber,
      paidAmount: command.paidAmount,
      comment: command.comment,
      internalNote: command.internalNote,
      status: PaymentExecutionStatus.COMPLETED,
      paidAt: command.paidAt ?? new Date(),
      proof: command.proof,
    });

    await this.transactions.create({
      walletId: savedWallet.id!,
      type: WalletTransactionType.WITHDRAW,
      amount: withdrawal.amount,
      balanceBefore: before,
      balanceAfter: savedWallet.balance,
      availableBalanceAfter: savedWallet.availableBalance,
      pendingBalanceAfter: savedWallet.pendingBalance,
      reference: `WITHDRAW:${withdrawal.id}`,
      description: 'Débit wallet après paiement manuel Mobile Money',
      status: WalletTransactionStatus.COMPLETED,
      createdBy: command.adminId,
      metadata: { withdrawalRequestId: withdrawal.id, paymentExecutionId: execution.id },
    });

    const paidWithdrawal = await this.withdrawals.markPaid(withdrawal.id);

    await this.notifications.notifyUser({
      userId: wallet.userId,
      title: 'Paiement effectué',
      message: `Votre retrait de ${withdrawal.amount} a été payé par Mobile Money.`,
      type: PaymentNotificationType.PAYMENT_COMPLETED,
      metadata: { withdrawalRequestId: withdrawal.id, paymentExecutionId: execution.id, proofUrl: command.proof?.fileUrl },
    });

    await this.audit.log({
      adminId: command.adminId,
      action: 'MANUAL_MOMO_PAYMENT_CONFIRMED',
      entity: 'PaymentExecution',
      entityId: execution.id,
      newValue: { withdrawalRequestId: withdrawal.id, paidAmount: command.paidAmount, transactionReference: command.transactionReference },
    });

    return { withdrawal: paidWithdrawal, execution, wallet: savedWallet };
  }
}

@Injectable()
export class GetPaymentConfigurationUseCase {
  constructor(@Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort) {}
  execute() { return this.configurations.getActive(); }
}

@Injectable()
export class UpdatePaymentConfigurationUseCase {
  constructor(
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(adminId: number, dto: any) {
    const config = await this.configurations.update(dto, adminId);
    await this.audit.log({ adminId, action: 'PAYMENT_CONFIGURATION_UPDATED', entity: 'PaymentConfiguration', entityId: config.id, newValue: dto });
    return config;
  }
}
