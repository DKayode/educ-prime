import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentNotificationPort,
  WalletRepositoryPort,
  WalletTransactionRepositoryPort,
} from '../../shared/payment.ports';
import { PaymentNotificationType, WalletTransactionStatus, WalletTransactionType } from '../../shared/payment.enums';
import { WalletAggregate } from '../domain/wallet.aggregate';

export type RewardableResource = 'epreuve' | 'concours' | 'examen_national';

export interface CreditWalletFromValidatedExamCommand {
  userId: number;
  examId: string;
  amount?: number;
  // Selects the per-entity reward amount from the active configuration when no
  // explicit `amount` is given. Defaults to the épreuve reward.
  resource?: RewardableResource;
  currency?: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CreditWalletFromValidatedExamUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(WALLET_TRANSACTION_REPOSITORY) private readonly transactions: WalletTransactionRepositoryPort,
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) { }

  async execute(command: CreditWalletFromValidatedExamCommand) {
    const configuration = await this.configurations.getActive();
    if (!configuration.walletEnabled || !configuration.rewardEnabled) {
      throw new ConflictException('La récompense des épreuves est désactivée');
    }

    const rewardByResource: Record<RewardableResource, number> = {
      epreuve: configuration.rewardPerExam,
      concours: configuration.rewardPerConcours,
      examen_national: configuration.rewardPerExamenNational,
    };
    const configured = command.resource ? rewardByResource[command.resource] : configuration.rewardPerExam;
    const amount = Number(command.amount ?? configured ?? configuration.rewardPerExam);
    if (!amount || amount <= 0) throw new BadRequestException('Le montant à créditer doit être supérieur à zéro');

    const reference = command.reference ?? `EXAM_REWARD:${command.examId}`;
    if (await this.transactions.existsByReference(reference)) return { duplicated: true, reference };

    let wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) wallet = await this.wallets.createForUser(command.userId, command.currency ?? configuration.currency);

    const aggregate = WalletAggregate.from(wallet);
    const balanceBefore = wallet.balance;

    if (configuration.reviewDelayHours > 0) aggregate.creditPending(amount);
    else aggregate.creditAvailable(amount);

    const savedWallet = await this.wallets.updateBalances(aggregate.value);

    const transaction = await this.transactions.create({
      walletId: savedWallet.id!,
      type: WalletTransactionType.REWARD,
      amount,
      balanceBefore,
      balanceAfter: savedWallet.balance,
      availableBalanceAfter: savedWallet.availableBalance,
      pendingBalanceAfter: savedWallet.pendingBalance,
      reference,
      description: command.description ?? `Récompense épreuve validée ${command.examId}`,
      status: configuration.reviewDelayHours > 0 ? WalletTransactionStatus.PENDING : WalletTransactionStatus.COMPLETED,
      metadata: { examId: command.examId, reviewDelayHours: configuration.reviewDelayHours, ...command.metadata },
    });

    await this.notifications.notifyUser({
      userId: command.userId,
      title: 'Wallet crédité',
      message: configuration.reviewDelayHours > 0
        ? `Votre récompense de ${amount} ${configuration.currency} est en attente.`
        : `Votre wallet a été crédité de ${amount} ${configuration.currency}.`,
      type: PaymentNotificationType.WALLET_CREDITED,
      metadata: { walletId: savedWallet.id, transactionId: transaction.id, examId: command.examId },
    });

    await this.audit.log({
      action: 'EXAM_REWARD_CREDITED',
      entity: 'Wallet',
      entityId: savedWallet.id,
      newValue: { userId: command.userId, amount, examId: command.examId, reference },
    });

    return { wallet: savedWallet, transaction, duplicated: false };
  }
}
