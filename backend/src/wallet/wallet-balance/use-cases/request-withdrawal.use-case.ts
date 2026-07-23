import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OTP_SMS_SENDER_PORT,
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  USER_PAYMENT_ACCOUNT_REPOSITORY,
  USER_PROFILE_PORT,
  WALLET_REPOSITORY,
  WALLET_RESTRICTION_REPOSITORY,
  WITHDRAWAL_OTP_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  OtpSmsSenderPort,
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentNotificationPort,
  UserPaymentAccountRepositoryPort,
  UserProfilePort,
  WalletRepositoryPort,
  WalletRestrictionRepositoryPort,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import { OtpDeliveryStatus, PaymentMethod, PaymentNotificationType, WithdrawalStatus } from '../../shared/payment.enums';
import { RuleEngineService } from '../../shared/rules-engine.service';
import { DEFAULT_WITHDRAWAL_RULES } from '../../shared/withdrawal.rules';
import { generateNumericOtp, hashWithdrawalOtp } from '../../otp/otp.util';
import { WithdrawalOtpStatus } from '../../otp/entities/withdrawal-otp.entity';

export interface RequestWithdrawalCommand {
  userId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentAccountId: string;
}

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(WALLET_RESTRICTION_REPOSITORY) private readonly restrictions: WalletRestrictionRepositoryPort,
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly withdrawalOtps: WithdrawalOtpRepositoryPort,
    @Inject(USER_PAYMENT_ACCOUNT_REPOSITORY) private readonly paymentAccounts: UserPaymentAccountRepositoryPort,
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
    @Inject(USER_PROFILE_PORT) private readonly users: UserProfilePort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
    @Inject(OTP_SMS_SENDER_PORT) private readonly otpSender: OtpSmsSenderPort,
    private readonly ruleEngine: RuleEngineService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: RequestWithdrawalCommand) {
    const amount = Number(command.amount);
    if (!amount || amount <= 0) throw new BadRequestException('Le montant du retrait doit être supérieur à zéro');

    const wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) throw new NotFoundException('Wallet introuvable');

    const user = await this.users.getPaymentProfile(command.userId);
    const configuration = await this.configurations.getActive();
    const restriction = await this.restrictions.findByUserId(command.userId);
    const paymentAccount = await this.paymentAccounts.findDefaultByUserId(command.userId);
    if (!paymentAccount || paymentAccount.id !== command.paymentAccountId) {
      throw new BadRequestException('Le compte Mobile Money sélectionné est invalide ou n’est pas le compte par défaut');
    }

    const existing = await this.withdrawals.findOpenByWalletId(wallet.id!);
    if (existing?.status === WithdrawalStatus.SECURITY_REVIEW_REQUIRED && configuration.otpBlockWithdrawalCreation) {
      throw new ForbiddenException('Une demande de retrait est en vérification de sécurité. Elle doit être débloquée par un administrateur avant toute nouvelle demande.');
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);

    const report = await this.ruleEngine.evaluate(DEFAULT_WITHDRAWAL_RULES, {
      user,
      wallet,
      restriction,
      amount,
      existingPendingWithdrawal: !!existing,
      configuration,
      dailyWithdrawalTotal: await this.withdrawals.sumPaidAmount(wallet.id!, startOfDay, now),
      monthlyWithdrawalTotal: await this.withdrawals.sumPaidAmount(wallet.id!, startOfMonth, now),
      todayWithdrawalCount: await this.withdrawals.countPaid(wallet.id!, startOfDay, now),
      weekWithdrawalCount: await this.withdrawals.countPaid(wallet.id!, startOfWeek, now),
      monthWithdrawalCount: await this.withdrawals.countPaid(wallet.id!, startOfMonth, now),
      paymentAccountExists: true,
      paymentAccountPhoneNumber: paymentAccount.phoneNumber,
    });

    if (!report.passed) {
      throw new ForbiddenException({ message: 'Retrait refusé par les règles métier', errors: report.failures });
    }

    const fees = configuration.withdrawFeeType === 'PERCENTAGE'
      ? Math.round((amount * configuration.withdrawFee / 100) * 100) / 100
      : configuration.withdrawFee;
    const paymentDeadline = new Date(now); paymentDeadline.setDate(paymentDeadline.getDate() + 2);

    if (!configuration.otpEnabled) {
      const withdrawal = await this.withdrawals.create({
        walletId: wallet.id!,
        amount,
        fees,
        netAmount: Math.max(0, amount - fees),
        paymentMethod: command.paymentMethod,
        paymentAccountId: paymentAccount.id,
        paymentDeadline,
        status: WithdrawalStatus.PENDING,
      });
      await this.notifications.notifyAdmins({
        title: 'Nouvelle demande de retrait',
        message: `Un utilisateur a soumis une demande de retrait de ${withdrawal.amount} ${configuration.currency}.`,
        type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
        metadata: { withdrawalRequestId: withdrawal.id, userId: command.userId },
      });
      return { ...withdrawal, message: 'Demande de retrait soumise sans OTP conformément à la configuration active.' };
    }

    const withdrawal = await this.withdrawals.create({
      walletId: wallet.id!,
      amount,
      fees,
      netAmount: Math.max(0, amount - fees),
      paymentMethod: command.paymentMethod,
      paymentAccountId: paymentAccount.id,
      paymentDeadline,
      status: WithdrawalStatus.OTP_PENDING,
    });

    const otpLength = Number(configuration.otpLength || this.config.get<string>('OTP_LENGTH', '6'));
    const otpTtlMinutes = Number(configuration.otpTtlMinutes || this.config.get<string>('OTP_TTL_MINUTES', '10'));
    const maxAttempts = Number(configuration.otpMaxAttempts || this.config.get<string>('OTP_MAX_ATTEMPTS', '3'));
    const debugEnabled = this.config.get<string>('OTP_DEBUG_ENABLED', 'true') === 'true' && this.config.get<string>('NODE_ENV', process.env.NODE_ENV || 'development') !== 'production';
    const otpSecret = this.config.get<string>('OTP_HASH_SECRET', this.config.get<string>('JWT_SECRET', 'edukia-wallet-lab-secret'));
    const code = generateNumericOtp(otpLength);
    const expiresAt = new Date(now.getTime() + otpTtlMinutes * 60 * 1000);
    const message = `EDUKIA : votre code de validation retrait est ${code}. Il expire dans ${otpTtlMinutes} minutes.`;
    const configuredProvider = String(configuration.otpProvider || this.config.get<string>('OTP_SMS_PROVIDER', 'console')).toLowerCase();

    let provider = configuredProvider;
    let providerMessageId: string | null | undefined = null;
    let providerBulkId: string | null | undefined = null;
    let failureReason: string | null = null;
    let otpStatus = WithdrawalOtpStatus.SENT;
    let deliveryStatus = configuredProvider === 'infobip' ? OtpDeliveryStatus.CREATED : OtpDeliveryStatus.NOT_REQUIRED;

    try {
      const sendResult = await this.otpSender.sendOtp({
        phoneNumber: paymentAccount.phoneNumber,
        code,
        message,
        provider: configuredProvider,
        withdrawalRequestId: withdrawal.id,
        userId: command.userId,
      });
      provider = sendResult.provider || provider;
      providerMessageId = sendResult.messageId;
      providerBulkId = sendResult.bulkId;
      deliveryStatus = sendResult.deliveryStatus ?? (provider === 'infobip' ? OtpDeliveryStatus.SENT_TO_PROVIDER : OtpDeliveryStatus.NOT_REQUIRED);
    } catch (error) {
      otpStatus = WithdrawalOtpStatus.FAILED;
      deliveryStatus = OtpDeliveryStatus.FAILED;
      failureReason = error instanceof Error ? error.message : 'Erreur inconnue pendant l’envoi OTP';
    }

    const nextDeliveryCheckAt = deliveryStatus === OtpDeliveryStatus.SENT_TO_PROVIDER
      ? new Date(now.getTime() + Number(this.config.get<string>('OTP_DELIVERY_UNKNOWN_AFTER_SECONDS', '120')) * 1000)
      : null;

    const otp = await this.withdrawalOtps.create({
      withdrawalRequestId: withdrawal.id,
      userId: command.userId,
      phoneNumber: paymentAccount.phoneNumber,
      codeHash: hashWithdrawalOtp(code, otpSecret),
      debugCode: debugEnabled ? code : null,
      expiresAt,
      maxAttempts,
      provider,
      providerMessageId,
      providerBulkId,
      failureReason,
      status: otpStatus,
      deliveryStatus,
      nextDeliveryCheckAt,
    });

    await this.notifications.notifyUser({
      userId: command.userId,
      title: 'Code OTP en cours d’envoi',
      message: `Votre code de validation est en cours d’envoi sur le numéro Mobile Money ${paymentAccount.phoneNumber}.`,
      type: PaymentNotificationType.WITHDRAWAL_OTP_SENT,
      metadata: { withdrawalRequestId: withdrawal.id, otpId: otp.id, expiresAt, deliveryStatus },
    });

    if (otpStatus === WithdrawalOtpStatus.FAILED) {
      await this.notifications.notifyAdmins({
        title: 'Échec envoi OTP retrait',
        message: `L’envoi OTP pour une demande de retrait a échoué.`,
        type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
        metadata: { withdrawalRequestId: withdrawal.id, userId: command.userId, failureReason },
      });
    }

    await this.audit.log({
      action: 'WITHDRAWAL_OTP_SENT_TO_PROVIDER',
      entity: 'WithdrawalRequest',
      entityId: withdrawal.id,
      newValue: { userId: command.userId, amount, fees, netAmount: Math.max(0, amount - fees), phoneNumber: paymentAccount.phoneNumber, otpStatus, deliveryStatus, provider, providerMessageId },
    });

    return {
      ...withdrawal,
      status: WithdrawalStatus.OTP_PENDING,
      otp: {
        sent: otpStatus === WithdrawalOtpStatus.SENT,
        provider,
        deliveryStatus,
        expiresAt,
        maxAttempts,
        debugAvailable: debugEnabled,
        failureReason,
      },
      message: otpStatus === WithdrawalOtpStatus.SENT
        ? `Votre code de validation est en cours d’envoi au numéro ${paymentAccount.phoneNumber}. Si vous ne le recevez pas, vous pourrez demander un renvoi sécurisé.`
        : `La demande est créée mais l’envoi OTP a échoué. Vous pouvez demander un nouveau code après quelques instants.`,
    };
  }
}
