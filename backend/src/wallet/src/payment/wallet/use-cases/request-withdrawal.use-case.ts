import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  USER_PAYMENT_ACCOUNT_REPOSITORY,
  USER_PROFILE_PORT,
  WALLET_REPOSITORY,
  WALLET_RESTRICTION_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentNotificationPort,
  UserPaymentAccountRepositoryPort,
  UserProfilePort,
  WalletRepositoryPort,
  WalletRestrictionRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import { PaymentMethod, PaymentNotificationType } from '../../shared/payment.enums';
import { RuleEngineService } from '../../shared/rules-engine.service';
import { DEFAULT_WITHDRAWAL_RULES } from '../../shared/withdrawal.rules';

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
    @Inject(USER_PAYMENT_ACCOUNT_REPOSITORY) private readonly paymentAccounts: UserPaymentAccountRepositoryPort,
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
    @Inject(USER_PROFILE_PORT) private readonly users: UserProfilePort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
    private readonly ruleEngine: RuleEngineService,
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

    const withdrawal = await this.withdrawals.create({
      walletId: wallet.id!,
      amount,
      fees,
      netAmount: Math.max(0, amount - fees),
      paymentMethod: command.paymentMethod,
      paymentAccountId: paymentAccount.id,
      paymentDeadline,
    });

    await this.notifications.notifyUser({
      userId: command.userId,
      title: 'Demande de retrait reçue',
      message: `Votre demande de retrait de ${amount} ${configuration.currency} sera traitée au plus tard le ${paymentDeadline.toLocaleDateString('fr-FR')}.`,
      type: PaymentNotificationType.WITHDRAWAL_REQUESTED,
      metadata: { withdrawalRequestId: withdrawal.id },
    });

    await this.notifications.notifyAdmins({
      title: 'Nouvelle demande de retrait',
      message: `Un utilisateur a demandé un retrait de ${amount} ${configuration.currency}.`,
      type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
      metadata: { withdrawalRequestId: withdrawal.id, userId: command.userId },
    });

    await this.audit.log({
      action: 'WITHDRAWAL_REQUESTED',
      entity: 'WithdrawalRequest',
      entityId: withdrawal.id,
      newValue: { userId: command.userId, amount, fees, netAmount: Math.max(0, amount - fees) },
    });

    return withdrawal;
  }
}
