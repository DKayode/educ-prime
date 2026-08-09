import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  PAYMENT_REWARD_CONFIGURATION_REPOSITORY,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentNotificationPort,
  PaymentRewardConfigurationModel,
  PaymentRewardConfigurationRepositoryPort,
  WalletRepositoryPort,
  WalletTransactionRepositoryPort,
} from '../../shared/payment.ports';
import {
  PaymentNotificationType,
  RewardSourceTypeCode,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../shared/payment.enums';
import { WalletAggregate } from '../../wallet-balance/domain/wallet.aggregate';

export interface CreditRewardSourceCommand {
  userId: number;
  sourceType: RewardSourceTypeCode;
  sourceId: string;
  amount?: number;
  currency?: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CreditRewardSourceUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(WALLET_TRANSACTION_REPOSITORY) private readonly transactions: WalletTransactionRepositoryPort,
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
    @Inject(PAYMENT_REWARD_CONFIGURATION_REPOSITORY) private readonly rewardConfigurations: PaymentRewardConfigurationRepositoryPort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(command: CreditRewardSourceCommand) {
    const sourceType = this.normalizeSourceType(command.sourceType);
    const sourceId = String(command.sourceId ?? '').trim();
    if (!sourceId) throw new BadRequestException('sourceId est obligatoire');

    const globalConfiguration = await this.configurations.getActive();
    if (!globalConfiguration.walletEnabled || !globalConfiguration.rewardEnabled) {
      throw new ConflictException('Le crédit des récompenses wallet est désactivé');
    }

    const rewardConfiguration = await this.rewardConfigurations.getActiveBySourceTypeCode(sourceType);
    if (!rewardConfiguration.rewardEnabled || !rewardConfiguration.isActive) {
      throw new ConflictException(`La récompense du type ${sourceType} est désactivée`);
    }

    const amount = Number(command.amount ?? rewardConfiguration.rewardAmount);
    if (!amount || amount <= 0) throw new BadRequestException('Le montant à créditer doit être supérieur à zéro');

    const reference = command.reference ?? `${sourceType}_REWARD:${sourceId}`;
    if (await this.transactions.existsByReference(reference)) {
      return { duplicated: true, reference, reason: 'REFERENCE_ALREADY_CREDITED' };
    }

    let wallet = await this.wallets.findByUserId(command.userId);
    if (!wallet) wallet = await this.wallets.createForUser(command.userId, command.currency ?? rewardConfiguration.currency ?? globalConfiguration.currency);

    if (await this.transactions.existsRewardForWalletSource(wallet.id!, sourceType, sourceId)) {
      return { duplicated: true, reference, reason: 'SOURCE_ALREADY_CREDITED' };
    }

    await this.ensureRewardLimits(wallet.id!, sourceType, amount, rewardConfiguration);

    const aggregate = WalletAggregate.from(wallet);
    const balanceBefore = wallet.balance;
    const shouldBePending = rewardConfiguration.requiresAdminValidation || rewardConfiguration.reviewDelayHours > 0;

    if (shouldBePending) aggregate.creditPending(amount);
    else aggregate.creditAvailable(amount);

    const savedWallet = await this.wallets.updateBalances(aggregate.value);
    const sourceLabel = rewardConfiguration.rewardSourceTypeLabel ?? this.sourceTypeLabel(sourceType);

    const transaction = await this.transactions.create({
      walletId: savedWallet.id!,
      type: WalletTransactionType.REWARD,
      amount,
      balanceBefore,
      balanceAfter: savedWallet.balance,
      availableBalanceAfter: savedWallet.availableBalance,
      pendingBalanceAfter: savedWallet.pendingBalance,
      reference,
      rewardSourceTypeId: rewardConfiguration.rewardSourceTypeId,
      rewardSourceTypeCode: sourceType,
      rewardSourceId: sourceId,
      rewardSourceReference: reference,
      description: command.description ?? `Récompense ${sourceLabel.toLowerCase()} validée ${sourceId}`,
      status: shouldBePending ? WalletTransactionStatus.PENDING : WalletTransactionStatus.COMPLETED,
      metadata: {
        rewardSourceType: sourceType,
        rewardSourceLabel: sourceLabel,
        rewardSourceId: sourceId,
        reviewDelayHours: rewardConfiguration.reviewDelayHours,
        requiresAdminValidation: rewardConfiguration.requiresAdminValidation,
        ...command.metadata,
      },
    });

    await this.notifications.notifyUser({
      userId: command.userId,
      title: shouldBePending ? 'Récompense en attente' : 'Wallet crédité',
      message: shouldBePending
        ? `Votre récompense de ${amount} ${rewardConfiguration.currency} pour ${sourceLabel.toLowerCase()} est en attente.`
        : `Votre wallet a été crédité de ${amount} ${rewardConfiguration.currency} pour ${sourceLabel.toLowerCase()}.`,
      type: PaymentNotificationType.WALLET_CREDITED,
      metadata: {
        walletId: savedWallet.id,
        transactionId: transaction.id,
        rewardSourceType: sourceType,
        rewardSourceId: sourceId,
      },
    });

    await this.audit.log({
      action: 'REWARD_SOURCE_CREDITED',
      entity: 'Wallet',
      entityId: savedWallet.id,
      newValue: {
        userId: command.userId,
        amount,
        rewardSourceType: sourceType,
        rewardSourceId: sourceId,
        reference,
      },
    });

    return {
      wallet: savedWallet,
      transaction,
      duplicated: false,
      rewardSource: {
        type: sourceType,
        label: sourceLabel,
        sourceId,
      },
      configuration: {
        rewardAmount: rewardConfiguration.rewardAmount,
        currency: rewardConfiguration.currency,
        rewardEnabled: rewardConfiguration.rewardEnabled,
        reviewDelayHours: rewardConfiguration.reviewDelayHours,
        requiresAdminValidation: rewardConfiguration.requiresAdminValidation,
      },
    };
  }

  private normalizeSourceType(sourceType: RewardSourceTypeCode): RewardSourceTypeCode {
    const normalized = String(sourceType ?? '').trim().toUpperCase() as RewardSourceTypeCode;
    if (!Object.values(RewardSourceTypeCode).includes(normalized)) {
      throw new BadRequestException(`sourceType invalide. Valeurs acceptées : ${Object.values(RewardSourceTypeCode).join(', ')}`);
    }
    return normalized;
  }

  private sourceTypeLabel(sourceType: RewardSourceTypeCode): string {
    switch (sourceType) {
      case RewardSourceTypeCode.EPREUVE:
        return 'Épreuve chargée';
      case RewardSourceTypeCode.EXAMEN:
        return 'Examen national chargé';
      case RewardSourceTypeCode.CONCOURS:
        return 'Concours chargé';
      default:
        return sourceType;
    }
  }

  private async ensureRewardLimits(
    walletId: string,
    sourceType: RewardSourceTypeCode,
    amount: number,
    configuration: PaymentRewardConfigurationModel,
  ): Promise<void> {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (configuration.maxRewardsPerUserPerDay > 0) {
      const count = await this.transactions.countRewardsForWalletSourceType(walletId, sourceType, dayStart, dayEnd);
      if (count >= configuration.maxRewardsPerUserPerDay) {
        throw new ConflictException(`Le plafond journalier de récompenses pour ${sourceType} est atteint`);
      }
    }

    if (configuration.maxRewardsPerUserPerMonth > 0) {
      const count = await this.transactions.countRewardsForWalletSourceType(walletId, sourceType, monthStart, monthEnd);
      if (count >= configuration.maxRewardsPerUserPerMonth) {
        throw new ConflictException(`Le plafond mensuel de récompenses pour ${sourceType} est atteint`);
      }
    }

    if (configuration.dailyRewardAmountLimit > 0) {
      const sum = await this.transactions.sumRewardsForWalletSourceType(walletId, sourceType, dayStart, dayEnd);
      if (sum + amount > configuration.dailyRewardAmountLimit) {
        throw new ConflictException(`La limite journalière de montant pour ${sourceType} est dépassée`);
      }
    }

    if (configuration.monthlyRewardAmountLimit > 0) {
      const sum = await this.transactions.sumRewardsForWalletSourceType(walletId, sourceType, monthStart, monthEnd);
      if (sum + amount > configuration.monthlyRewardAmountLimit) {
        throw new ConflictException(`La limite mensuelle de montant pour ${sourceType} est dépassée`);
      }
    }
  }
}
