import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Between, DeepPartial, In, LessThanOrEqual, Repository } from 'typeorm';
import { DataSourceResolver } from 'src/config/data-source-resolver.service';
import { UtilisateursService } from 'src/utilisateurs/utilisateurs.service';
import {
  PaymentAuditLogPort,
  PaymentConfigurationModel,
  PaymentConfigurationRepositoryPort,
  PaymentExecutionRepositoryPort,
  PaymentNotificationPort,
  UserPaymentAccountModel,
  UserPaymentAccountRepositoryPort,
  UserProfilePort,
  WalletActivityHistoryItemModel,
  WalletModel,
  WalletRepositoryPort,
  WalletRestrictionModel,
  WalletRestrictionRepositoryPort,
  WalletTransactionModel,
  WalletTransactionRepositoryPort,
  WithdrawalOtpModel,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestModel,
  WithdrawalRequestRepositoryPort,
} from '../shared/payment.ports';
import { OtpDeliveryStatus, WalletStatus, WalletTransactionType, WithdrawalSecurityStatus, WithdrawalStatus } from '../shared/payment.enums';
import { WithdrawalOtpStatus } from '../otp/entities/withdrawal-otp.entity';
import { WalletEntity } from '../wallet-balance/entities/wallet.entity';
import { WalletTransactionEntity } from '../wallet-balance/entities/wallet-transaction.entity';
import { WalletRestrictionEntity } from '../wallet-balance/entities/wallet-restriction.entity';
import { WithdrawalRequestEntity } from '../user-payment/entities/withdrawal-request.entity';
import { UserPaymentAccountEntity } from '../user-payment/entities/user-payment-account.entity';
import { UserPaymentAccountHistoryEntity } from '../user-payment/entities/user-payment-account-history.entity';
import { PaymentExecutionEntity } from '../user-payment/entities/payment-execution.entity';
import { PaymentProofEntity } from '../user-payment/entities/payment-proof.entity';
import { PaymentConfigurationEntity } from '../user-payment/entities/payment-configuration.entity';
import { PaymentNotificationEntity } from '../user-payment/entities/payment-notification.entity';
import { PaymentAuditLogEntity } from '../user-payment/entities/payment-audit-log.entity';
import { WithdrawalOtpEntity } from '../otp/entities/withdrawal-otp.entity';

@Injectable()
export class TypeOrmWalletRepository implements WalletRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<WalletEntity> { return this.resolver.getRepository(WalletEntity); }

  async findById(walletId: string): Promise<WalletModel | null> {
    const row = await this.repo.findOne({ where: { id: walletId } });
    return row ? this.map(row) : null;
  }

  async findByUserId(userId: number): Promise<WalletModel | null> {
    const row = await this.repo.findOne({ where: { userId } });
    return row ? this.map(row) : null;
  }

  async createForUser(userId: number, currency: string): Promise<WalletModel> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    const row = await this.repo.save(this.repo.create({ userId, currency, availableBalance: 0, pendingBalance: 0, status: WalletStatus.ACTIVE }));
    return this.map(row);
  }

  async updateBalances(wallet: WalletModel): Promise<WalletModel> {
    const row = await this.repo.findOne({ where: { id: wallet.id } });
    if (!row) throw new NotFoundException('Wallet introuvable');
    row.availableBalance = wallet.availableBalance;
    row.pendingBalance = wallet.pendingBalance;
    row.status = wallet.status;
    return this.map(await this.repo.save(row));
  }

  private map(row: WalletEntity): WalletModel {
    return {
      id: row.id,
      userId: row.userId,
      balance: Number(row.availableBalance) + Number(row.pendingBalance),
      availableBalance: Number(row.availableBalance),
      pendingBalance: Number(row.pendingBalance),
      currency: row.currency,
      status: row.status,
    };
  }
}

@Injectable()
export class TypeOrmWalletTransactionRepository implements WalletTransactionRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<WalletTransactionEntity> { return this.resolver.getRepository(WalletTransactionEntity); }

  existsByReference(reference: string): Promise<boolean> {
    return this.repo.exist({ where: { reference } });
  }

  async create(data: Parameters<WalletTransactionRepositoryPort['create']>[0]): Promise<WalletTransactionModel> {
    const entity = this.repo.create(data as DeepPartial<WalletTransactionEntity>);
    return this.map(await this.repo.save(entity));
  }

  private map(row: WalletTransactionEntity): WalletTransactionModel {
    return {
      id: row.id,
      walletId: row.walletId,
      type: row.type,
      amount: Number(row.amount),
      balanceBefore: Number(row.balanceBefore),
      balanceAfter: Number(row.balanceAfter),
      reference: row.reference,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  async findByWalletId(walletId: string, page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({
      where: { walletId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: data.map((row) => this.map(row)), total };
  }

  async findByWalletIdForAdmin(walletId: string, page = 1, limit = 50) {
    return this.findByWalletId(walletId, page, limit);
  }

  async sumByType(walletId: string, type: WalletTransactionType): Promise<number> {
    const result = await this.repo.createQueryBuilder('t')
      .select('COALESCE(SUM(t.amount), 0)', 'sum')
      .where('t.wallet_id = :walletId', { walletId })
      .andWhere('t.type = :type', { type })
      .getRawOne();
    return Number(result?.sum ?? 0);
  }
}

@Injectable()
export class TypeOrmWalletRestrictionRepository implements WalletRestrictionRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<WalletRestrictionEntity> { return this.resolver.getRepository(WalletRestrictionEntity); }

  async findByUserId(userId: number): Promise<WalletRestrictionModel | null> {
    return await this.repo.findOne({ where: { userId } }) as WalletRestrictionModel | null;
  }

  async ensureForUser(userId: number): Promise<WalletRestrictionModel> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    return await this.repo.save(this.repo.create({ userId, canReceiveMoney: true, canWithdraw: true, canTransfer: false, blocked: false })) as WalletRestrictionModel;
  }
}

@Injectable()
export class TypeOrmWithdrawalRequestRepository implements WithdrawalRequestRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<WithdrawalRequestEntity> { return this.resolver.getRepository(WithdrawalRequestEntity); }

  async create(data: Parameters<WithdrawalRequestRepositoryPort['create']>[0]): Promise<WithdrawalRequestModel> {
    const entity = this.repo.create(data as DeepPartial<WithdrawalRequestEntity>);
    const saved = await this.repo.save(entity);
    return this.map(saved);
  }

  async findById(id: string): Promise<WithdrawalRequestModel | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findOpenByWalletId(walletId: string): Promise<WithdrawalRequestModel | null> {
    const row = await this.repo.findOne({
      where: {
        walletId,
        status: In([
          WithdrawalStatus.OTP_PENDING,
          WithdrawalStatus.PENDING,
          WithdrawalStatus.APPROVED,
          WithdrawalStatus.PROCESSING,
          WithdrawalStatus.SECURITY_REVIEW_REQUIRED,
        ]),
      },
      order: { createdAt: 'DESC' },
    });
    return row ? this.map(row) : null;
  }

  async findForAdmin(status?: WithdrawalStatus, page = 1, limit = 20) {
    const where = status ? { status } : {};
    const [data, total] = await this.repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { data: data.map((row) => this.map(row)), total };
  }

  async findByWalletId(walletId: string, page = 1, limit = 50) {
    const [data, total] = await this.repo.findAndCount({ where: { walletId }, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { data: data.map((row) => this.map(row)), total };
  }

  /**
   * Historique utilisateur complet du wallet.
   *
   * Ce flux ne se limite pas aux écritures financières de wallet_transactions.
   * Il reconstruit aussi les étapes du processus de retrait : création de la
   * demande, envoi OTP, livraison/non-livraison Infobip, vérification OTP,
   * passage en attente admin, approbation, rejet, paiement manuel et débit final.
   *
   * Objectif mobile : permettre à l’utilisateur de suivre son retrait étape par
   * étape depuis un seul endpoint : GET /wallet/me/transactions.
   */
  async findWalletActivityHistory(walletId: string, page = 1, limit = 20): Promise<{ data: WalletActivityHistoryItemModel[]; total: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

    const walletTransactionRepo = this.resolver.getRepository(WalletTransactionEntity);
    const otpRepo = this.resolver.getRepository(WithdrawalOtpEntity);
    const executionRepo = this.resolver.getRepository(PaymentExecutionEntity);

    const [transactions, withdrawals] = await Promise.all([
      walletTransactionRepo.find({ where: { walletId }, order: { createdAt: 'DESC' } }),
      this.repo.find({ where: { walletId }, order: { createdAt: 'DESC' } }),
    ]);

    const withdrawalIds = withdrawals.map((withdrawal) => withdrawal.id);
    const [otps, executions] = withdrawalIds.length
      ? await Promise.all([
          otpRepo.find({ where: { withdrawalRequestId: In(withdrawalIds) }, order: { createdAt: 'ASC' } }),
          executionRepo.find({ where: { withdrawalRequestId: In(withdrawalIds) }, order: { createdAt: 'ASC' } }),
        ])
      : [[], []];

    const events: WalletActivityHistoryItemModel[] = [];

    const addEvent = (event: Omit<WalletActivityHistoryItemModel, 'id' | 'walletId' | 'occurredAt'> & {
      id?: string;
      occurredAt?: Date | string | null;
    }) => {
      const occurredAt = this.toDateOrNull(event.occurredAt);
      if (!occurredAt) return;

      const display = this.timelineDisplay(event.source, event.eventType, event.status ?? null);

      events.push({
        ...event,
        id: event.id ?? `${event.source}:${event.eventType}:${event.withdrawalRequestId ?? event.walletTransactionId ?? event.otpId ?? event.paymentExecutionId ?? occurredAt.getTime()}`,
        walletId,
        occurredAt,
        label: event.label ?? display.label,
        mobileMessage: event.mobileMessage ?? display.mobileMessage,
        severity: event.severity ?? display.severity,
        nextAction: event.nextAction ?? display.nextAction,
        isTerminal: event.isTerminal ?? display.isTerminal,
      });
    };

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      const isDebit = transaction.type === WalletTransactionType.WITHDRAW;
      addEvent({
        id: `wallet-transaction:${transaction.id}`,
        source: 'WALLET_TRANSACTION',
        category: 'FINANCIAL',
        eventType: `WALLET_TRANSACTION_${transaction.type}`,
        title: this.walletTransactionTitle(transaction.type),
        description: transaction.description ?? null,
        occurredAt: transaction.createdAt,
        walletTransactionId: transaction.id,
        amount: isDebit ? -Math.abs(amount) : amount,
        balanceBefore: Number(transaction.balanceBefore),
        balanceAfter: Number(transaction.balanceAfter),
        reference: transaction.reference,
        status: transaction.status,
        metadata: {
          type: transaction.type,
          availableBalanceAfter: Number(transaction.availableBalanceAfter),
          pendingBalanceAfter: Number(transaction.pendingBalanceAfter),
          createdBy: transaction.createdBy ?? null,
          transactionMetadata: transaction.metadata ?? null,
        },
      });
    }

    for (const withdrawal of withdrawals) {
      const relatedOtps = otps.filter((otp) => otp.withdrawalRequestId === withdrawal.id);
      const relatedExecutions = executions.filter((execution) => execution.withdrawalRequestId === withdrawal.id);

      const withdrawalMetadata = {
        withdrawalRequestId: withdrawal.id,
        amount: Number(withdrawal.amount),
        fees: Number(withdrawal.fees),
        netAmount: Number(withdrawal.netAmount),
        paymentMethod: withdrawal.paymentMethod,
        paymentAccountId: withdrawal.paymentAccountId ?? null,
        paymentDeadline: withdrawal.paymentDeadline ?? null,
        currentStatus: withdrawal.status,
        securityStatus: withdrawal.securityStatus,
      };

      addEvent({
        id: `withdrawal-created:${withdrawal.id}`,
        source: 'WITHDRAWAL_REQUEST',
        category: 'WITHDRAWAL_PROCESS',
        eventType: 'WITHDRAWAL_CREATED',
        title: 'Demande de retrait créée',
        description: 'La demande de retrait a été créée et attend la vérification OTP.',
        occurredAt: withdrawal.createdAt,
        withdrawalRequestId: withdrawal.id,
        amount: Number(withdrawal.amount),
        fees: Number(withdrawal.fees),
        netAmount: Number(withdrawal.netAmount),
        status: WithdrawalStatus.OTP_PENDING,
        metadata: withdrawalMetadata,
      });

      if (withdrawal.otpLockedAt || withdrawal.status === WithdrawalStatus.SECURITY_REVIEW_REQUIRED) {
        addEvent({
          id: `withdrawal-security-review:${withdrawal.id}`,
          source: 'WITHDRAWAL_REQUEST',
          category: 'WITHDRAWAL_PROCESS',
          eventType: 'WITHDRAWAL_SECURITY_REVIEW_REQUIRED',
          title: 'Vérification de sécurité requise',
          description: withdrawal.securityReviewReason ?? 'La demande nécessite une vérification par l’administration.',
          occurredAt: withdrawal.otpLockedAt ?? withdrawal.updatedAt,
          withdrawalRequestId: withdrawal.id,
          amount: Number(withdrawal.amount),
          fees: Number(withdrawal.fees),
          netAmount: Number(withdrawal.netAmount),
          status: WithdrawalStatus.SECURITY_REVIEW_REQUIRED,
          metadata: withdrawalMetadata,
        });
      }

      if (withdrawal.otpUnlockedAt) {
        addEvent({
          id: `withdrawal-otp-unlocked:${withdrawal.id}`,
          source: 'WITHDRAWAL_REQUEST',
          category: 'WITHDRAWAL_PROCESS',
          eventType: 'WITHDRAWAL_OTP_UNLOCKED',
          title: 'Demande débloquée par l’administration',
          description: withdrawal.securityReviewReason ?? 'La demande a été débloquée après vérification administrative.',
          occurredAt: withdrawal.otpUnlockedAt,
          withdrawalRequestId: withdrawal.id,
          amount: Number(withdrawal.amount),
          fees: Number(withdrawal.fees),
          netAmount: Number(withdrawal.netAmount),
          status: WithdrawalStatus.OTP_PENDING,
          metadata: withdrawalMetadata,
        });
      }

      if (withdrawal.approvedAt) {
        addEvent({
          id: `withdrawal-approved:${withdrawal.id}`,
          source: 'WITHDRAWAL_REQUEST',
          category: 'WITHDRAWAL_PROCESS',
          eventType: 'WITHDRAWAL_APPROVED',
          title: 'Retrait approuvé',
          description: 'La demande de retrait a été approuvée par l’administration.',
          occurredAt: withdrawal.approvedAt,
          withdrawalRequestId: withdrawal.id,
          amount: Number(withdrawal.amount),
          fees: Number(withdrawal.fees),
          netAmount: Number(withdrawal.netAmount),
          status: WithdrawalStatus.APPROVED,
          metadata: { ...withdrawalMetadata, approvedBy: withdrawal.approvedBy ?? null },
        });
      }

      if (withdrawal.rejectedAt) {
        addEvent({
          id: `withdrawal-rejected:${withdrawal.id}`,
          source: 'WITHDRAWAL_REQUEST',
          category: 'WITHDRAWAL_PROCESS',
          eventType: 'WITHDRAWAL_REJECTED',
          title: 'Retrait rejeté',
          description: withdrawal.rejectedReason ?? 'La demande de retrait a été rejetée par l’administration.',
          occurredAt: withdrawal.rejectedAt,
          withdrawalRequestId: withdrawal.id,
          amount: Number(withdrawal.amount),
          fees: Number(withdrawal.fees),
          netAmount: Number(withdrawal.netAmount),
          status: WithdrawalStatus.REJECTED,
          metadata: { ...withdrawalMetadata, rejectedBy: withdrawal.rejectedBy ?? null },
        });
      }

      for (const otp of relatedOtps) {
        addEvent({
          id: `otp-sent:${otp.id}`,
          source: 'WITHDRAWAL_OTP',
          category: 'OTP',
          eventType: otp.resendCount > 0 ? 'WITHDRAWAL_OTP_RESENT' : 'WITHDRAWAL_OTP_SENT',
          title: otp.resendCount > 0 ? 'Code OTP renvoyé' : 'Code OTP envoyé',
          description: 'Un code OTP a été envoyé au numéro Mobile Money associé à la demande.',
          occurredAt: otp.lastSentAt ?? otp.createdAt,
          withdrawalRequestId: withdrawal.id,
          otpId: otp.id,
          amount: Number(withdrawal.amount),
          fees: Number(withdrawal.fees),
          netAmount: Number(withdrawal.netAmount),
          status: otp.status,
          metadata: this.otpMetadata(otp),
        });

        if (otp.deliveryStatus && otp.deliveryStatus !== OtpDeliveryStatus.CREATED) {
          const deliveryDate = otp.deliveredAt ?? otp.failedAt ?? otp.lastProviderCallbackAt ?? otp.updatedAt;
          addEvent({
            id: `otp-delivery:${otp.id}:${otp.deliveryStatus}`,
            source: 'WITHDRAWAL_OTP',
            category: 'OTP',
            eventType: `WITHDRAWAL_OTP_DELIVERY_${otp.deliveryStatus}`,
            title: this.otpDeliveryTitle(otp.deliveryStatus),
            description: otp.providerStatusDescription ?? otp.deliveryErrorMessage ?? otp.failureReason ?? null,
            occurredAt: deliveryDate,
            withdrawalRequestId: withdrawal.id,
            otpId: otp.id,
            amount: Number(withdrawal.amount),
            fees: Number(withdrawal.fees),
            netAmount: Number(withdrawal.netAmount),
            status: otp.deliveryStatus,
            metadata: this.otpMetadata(otp),
          });
        }

        if (otp.consumedAt) {
          addEvent({
            id: `otp-verified:${otp.id}`,
            source: 'WITHDRAWAL_OTP',
            category: 'OTP',
            eventType: 'WITHDRAWAL_OTP_VERIFIED',
            title: 'Code OTP vérifié',
            description: 'Le code OTP a été correctement renseigné par l’utilisateur.',
            occurredAt: otp.consumedAt,
            withdrawalRequestId: withdrawal.id,
            otpId: otp.id,
            amount: Number(withdrawal.amount),
            fees: Number(withdrawal.fees),
            netAmount: Number(withdrawal.netAmount),
            status: WithdrawalOtpStatus.VERIFIED,
            metadata: this.otpMetadata(otp),
          });

          addEvent({
            id: `withdrawal-pending-after-otp:${withdrawal.id}:${otp.id}`,
            source: 'WITHDRAWAL_REQUEST',
            category: 'WITHDRAWAL_PROCESS',
            eventType: 'WITHDRAWAL_PENDING_AFTER_OTP',
            title: 'Retrait soumis à l’administration',
            description: 'Le code OTP a été validé. La demande est maintenant en attente de traitement administrateur.',
            occurredAt: otp.consumedAt,
            withdrawalRequestId: withdrawal.id,
            amount: Number(withdrawal.amount),
            fees: Number(withdrawal.fees),
            netAmount: Number(withdrawal.netAmount),
            status: WithdrawalStatus.PENDING,
            metadata: withdrawalMetadata,
          });
        }

        if (otp.status === WithdrawalOtpStatus.EXPIRED) {
          addEvent({
            id: `otp-expired:${otp.id}`,
            source: 'WITHDRAWAL_OTP',
            category: 'OTP',
            eventType: 'WITHDRAWAL_OTP_EXPIRED',
            title: 'Code OTP expiré',
            description: 'Le code OTP n’est plus valide.',
            occurredAt: otp.expiresAt ?? otp.updatedAt,
            withdrawalRequestId: withdrawal.id,
            otpId: otp.id,
            amount: Number(withdrawal.amount),
            fees: Number(withdrawal.fees),
            netAmount: Number(withdrawal.netAmount),
            status: WithdrawalOtpStatus.EXPIRED,
            metadata: this.otpMetadata(otp),
          });
        }

        if (otp.status === WithdrawalOtpStatus.LOCKED || otp.lockedAt) {
          addEvent({
            id: `otp-locked:${otp.id}`,
            source: 'WITHDRAWAL_OTP',
            category: 'OTP',
            eventType: 'WITHDRAWAL_OTP_LOCKED',
            title: 'OTP bloqué',
            description: otp.lockedReason ?? 'Le nombre maximal de tentatives OTP a été atteint.',
            occurredAt: otp.lockedAt ?? otp.updatedAt,
            withdrawalRequestId: withdrawal.id,
            otpId: otp.id,
            amount: Number(withdrawal.amount),
            fees: Number(withdrawal.fees),
            netAmount: Number(withdrawal.netAmount),
            status: WithdrawalOtpStatus.LOCKED,
            metadata: this.otpMetadata(otp),
          });
        }

        if (otp.unlockedAt) {
          addEvent({
            id: `otp-unlocked:${otp.id}`,
            source: 'WITHDRAWAL_OTP',
            category: 'OTP',
            eventType: 'WITHDRAWAL_OTP_UNLOCKED',
            title: 'OTP débloqué',
            description: otp.unlockReason ?? 'L’OTP a été débloqué après vérification administrative.',
            occurredAt: otp.unlockedAt,
            withdrawalRequestId: withdrawal.id,
            otpId: otp.id,
            amount: Number(withdrawal.amount),
            fees: Number(withdrawal.fees),
            netAmount: Number(withdrawal.netAmount),
            status: WithdrawalOtpStatus.SENT,
            metadata: this.otpMetadata(otp),
          });
        }

        if (otp.status === WithdrawalOtpStatus.FAILED || otp.failureReason) {
          addEvent({
            id: `otp-failed:${otp.id}`,
            source: 'WITHDRAWAL_OTP',
            category: 'OTP',
            eventType: 'WITHDRAWAL_OTP_FAILED',
            title: 'Échec OTP',
            description: otp.failureReason ?? 'L’envoi ou la validation OTP a échoué.',
            occurredAt: otp.failedAt ?? otp.updatedAt,
            withdrawalRequestId: withdrawal.id,
            otpId: otp.id,
            amount: Number(withdrawal.amount),
            fees: Number(withdrawal.fees),
            netAmount: Number(withdrawal.netAmount),
            status: WithdrawalOtpStatus.FAILED,
            metadata: this.otpMetadata(otp),
          });
        }
      }

      for (const execution of relatedExecutions) {
        addEvent({
          id: `payment-execution:${execution.id}`,
          source: 'PAYMENT_EXECUTION',
          category: 'PAYMENT',
          eventType: `PAYMENT_EXECUTION_${execution.status}`,
          title: execution.status === 'COMPLETED' ? 'Paiement Mobile Money confirmé' : 'Paiement Mobile Money enregistré',
          description: execution.comment ?? null,
          occurredAt: execution.paidAt ?? execution.createdAt,
          withdrawalRequestId: withdrawal.id,
          paymentExecutionId: execution.id,
          amount: Number(execution.paidAmount),
          status: execution.status,
          reference: execution.transactionReference,
          metadata: {
            provider: execution.provider,
            phoneNumber: execution.phoneNumber,
            paidAt: execution.paidAt,
            batchId: execution.batchId ?? null,
          },
        });
      }

      if (withdrawal.status === WithdrawalStatus.PAID) {
        addEvent({
          id: `withdrawal-paid:${withdrawal.id}`,
          source: 'WITHDRAWAL_REQUEST',
          category: 'WITHDRAWAL_PROCESS',
          eventType: 'WITHDRAWAL_PAID',
          title: 'Retrait payé',
          description: 'Le paiement manuel Mobile Money a été confirmé.',
          occurredAt: relatedExecutions[0]?.paidAt ?? withdrawal.updatedAt,
          withdrawalRequestId: withdrawal.id,
          amount: Number(withdrawal.amount),
          fees: Number(withdrawal.fees),
          netAmount: Number(withdrawal.netAmount),
          status: WithdrawalStatus.PAID,
          metadata: withdrawalMetadata,
        });
      }
    }

    const deduplicated = Array.from(
      new Map(events.map((event) => [event.id, event])).values(),
    );

    deduplicated.sort((a, b) => {
      const diff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (diff !== 0) return diff;
      return this.eventPriority(b.eventType) - this.eventPriority(a.eventType);
    });

    const total = deduplicated.length;
    const data = deduplicated.slice((safePage - 1) * safeLimit, safePage * safeLimit);
    return { data, total };
  }

  /**
   * Messages métier prêts pour le mobile.
   *
   * Important : le mobile doit afficher en priorité ces champs quand ils sont présents.
   * Cela évite de dupliquer la logique métier d'affichage côté Flutter/React Native.
   */
  private timelineDisplay(source: string, eventType: string, status?: string | null): {
    label: string;
    mobileMessage: string;
    severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    nextAction: 'NONE' | 'ENTER_OTP' | 'RESEND_OTP' | 'WAIT_ADMIN_REVIEW' | 'WAIT_ADMIN_APPROVAL' | 'WAIT_PAYMENT' | 'CONTACT_SUPPORT' | 'VIEW_PAYMENT_PROOF';
    isTerminal: boolean;
  } {
    const displays: Record<string, {
      label: string;
      mobileMessage: string;
      severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
      nextAction: 'NONE' | 'ENTER_OTP' | 'RESEND_OTP' | 'WAIT_ADMIN_REVIEW' | 'WAIT_ADMIN_APPROVAL' | 'WAIT_PAYMENT' | 'CONTACT_SUPPORT' | 'VIEW_PAYMENT_PROOF';
      isTerminal: boolean;
    }> = {
      WALLET_TRANSACTION_REWARD: {
        label: 'Récompense créditée',
        mobileMessage: 'Votre wallet a été crédité après validation de votre épreuve.',
        severity: 'SUCCESS',
        nextAction: 'NONE',
        isTerminal: true,
      },
      WALLET_TRANSACTION_RELEASE: {
        label: 'Fonds disponibles',
        mobileMessage: 'Les fonds en attente sont maintenant disponibles dans votre wallet.',
        severity: 'SUCCESS',
        nextAction: 'NONE',
        isTerminal: true,
      },
      WALLET_TRANSACTION_WITHDRAW: {
        label: 'Montant débité',
        mobileMessage: 'Le montant du retrait a été débité de votre wallet.',
        severity: 'SUCCESS',
        nextAction: 'NONE',
        isTerminal: true,
      },
      WALLET_TRANSACTION_ADJUSTMENT: {
        label: 'Ajustement wallet',
        mobileMessage: 'Un ajustement a été effectué sur votre wallet.',
        severity: 'INFO',
        nextAction: 'NONE',
        isTerminal: true,
      },

      WITHDRAWAL_CREATED: {
        label: 'Demande de retrait créée',
        mobileMessage: 'Votre demande de retrait a été créée. Veuillez saisir le code OTP envoyé sur votre numéro Mobile Money.',
        severity: 'INFO',
        nextAction: 'ENTER_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_PENDING_AFTER_OTP: {
        label: 'Demande transmise',
        mobileMessage: 'Votre code OTP a été vérifié. Votre demande est maintenant en attente de traitement par l’administration.',
        severity: 'SUCCESS',
        nextAction: 'WAIT_ADMIN_APPROVAL',
        isTerminal: false,
      },
      WITHDRAWAL_SECURITY_REVIEW_REQUIRED: {
        label: 'Vérification requise',
        mobileMessage: 'Votre demande nécessite une vérification de sécurité par l’équipe EDUKIA.',
        severity: 'WARNING',
        nextAction: 'WAIT_ADMIN_REVIEW',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_UNLOCKED: {
        label: 'Demande débloquée',
        mobileMessage: 'Votre demande a été débloquée après vérification. Vous pouvez poursuivre la validation OTP.',
        severity: 'SUCCESS',
        nextAction: 'ENTER_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_APPROVED: {
        label: 'Retrait approuvé',
        mobileMessage: 'Votre demande de retrait a été approuvée. Le paiement Mobile Money sera traité par l’équipe EDUKIA.',
        severity: 'SUCCESS',
        nextAction: 'WAIT_PAYMENT',
        isTerminal: false,
      },
      WITHDRAWAL_REJECTED: {
        label: 'Retrait rejeté',
        mobileMessage: 'Votre demande de retrait a été rejetée. Consultez le motif ou contactez le support si nécessaire.',
        severity: 'ERROR',
        nextAction: 'CONTACT_SUPPORT',
        isTerminal: true,
      },
      WITHDRAWAL_PAID: {
        label: 'Retrait payé',
        mobileMessage: 'Votre retrait a été payé avec succès.',
        severity: 'SUCCESS',
        nextAction: 'VIEW_PAYMENT_PROOF',
        isTerminal: true,
      },

      WITHDRAWAL_OTP_SENT: {
        label: 'Code OTP envoyé',
        mobileMessage: 'Un code OTP vous a été envoyé sur votre numéro Mobile Money.',
        severity: 'INFO',
        nextAction: 'ENTER_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_RESENT: {
        label: 'Code OTP renvoyé',
        mobileMessage: 'Un nouveau code OTP vous a été envoyé. Veuillez utiliser le dernier code reçu.',
        severity: 'INFO',
        nextAction: 'ENTER_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_VERIFIED: {
        label: 'Code OTP vérifié',
        mobileMessage: 'Votre code OTP a été vérifié avec succès.',
        severity: 'SUCCESS',
        nextAction: 'WAIT_ADMIN_APPROVAL',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_EXPIRED: {
        label: 'Code OTP expiré',
        mobileMessage: 'Votre code OTP a expiré. Vous pouvez demander un nouveau code.',
        severity: 'WARNING',
        nextAction: 'RESEND_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_FAILED: {
        label: 'Échec OTP',
        mobileMessage: 'Le code OTP saisi est incorrect ou l’envoi OTP a échoué. Veuillez réessayer.',
        severity: 'WARNING',
        nextAction: 'ENTER_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_LOCKED: {
        label: 'OTP bloqué',
        mobileMessage: 'Votre demande est bloquée après plusieurs tentatives incorrectes. L’équipe EDUKIA doit effectuer une vérification.',
        severity: 'ERROR',
        nextAction: 'WAIT_ADMIN_REVIEW',
        isTerminal: false,
      },

      WITHDRAWAL_OTP_DELIVERY_SENT_TO_PROVIDER: {
        label: 'OTP en cours d’envoi',
        mobileMessage: 'Votre code OTP est en cours d’envoi par SMS.',
        severity: 'INFO',
        nextAction: 'ENTER_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_DELIVERY_DELIVERED: {
        label: 'OTP livré',
        mobileMessage: 'Le code OTP a été livré sur votre téléphone.',
        severity: 'SUCCESS',
        nextAction: 'ENTER_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_DELIVERY_UNDELIVERED: {
        label: 'OTP non livré',
        mobileMessage: 'Le code OTP n’a pas pu être livré. Vous pouvez demander un nouveau code ou vérifier votre numéro.',
        severity: 'WARNING',
        nextAction: 'RESEND_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_DELIVERY_FAILED: {
        label: 'Livraison OTP échouée',
        mobileMessage: 'L’envoi du code OTP a échoué. Veuillez demander un nouveau code.',
        severity: 'ERROR',
        nextAction: 'RESEND_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_DELIVERY_DELIVERY_UNKNOWN: {
        label: 'Livraison OTP inconnue',
        mobileMessage: 'Nous vérifions encore la livraison de votre code OTP. Vous pourrez demander un nouveau code si vous ne le recevez pas.',
        severity: 'INFO',
        nextAction: 'RESEND_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_DELIVERY_DELIVERY_TIMEOUT: {
        label: 'Délai de livraison dépassé',
        mobileMessage: 'Le délai de livraison du code OTP est dépassé. Vous pouvez demander un nouveau code.',
        severity: 'WARNING',
        nextAction: 'RESEND_OTP',
        isTerminal: false,
      },
      WITHDRAWAL_OTP_DELIVERY_NOT_REQUIRED: {
        label: 'Livraison SMS non requise',
        mobileMessage: 'Aucune livraison SMS n’est requise pour cette opération.',
        severity: 'INFO',
        nextAction: 'NONE',
        isTerminal: false,
      },

      PAYMENT_EXECUTION_PENDING: {
        label: 'Paiement en attente',
        mobileMessage: 'Votre paiement est en attente de confirmation.',
        severity: 'INFO',
        nextAction: 'WAIT_PAYMENT',
        isTerminal: false,
      },
      PAYMENT_EXECUTION_COMPLETED: {
        label: 'Paiement confirmé',
        mobileMessage: 'Votre paiement Mobile Money a été confirmé.',
        severity: 'SUCCESS',
        nextAction: 'VIEW_PAYMENT_PROOF',
        isTerminal: true,
      },
      PAYMENT_EXECUTION_FAILED: {
        label: 'Paiement échoué',
        mobileMessage: 'Le paiement Mobile Money a échoué. Contactez le support EDUKIA.',
        severity: 'ERROR',
        nextAction: 'CONTACT_SUPPORT',
        isTerminal: true,
      },
      PAYMENT_EXECUTION_CANCELLED: {
        label: 'Paiement annulé',
        mobileMessage: 'Le paiement Mobile Money a été annulé.',
        severity: 'WARNING',
        nextAction: 'CONTACT_SUPPORT',
        isTerminal: true,
      },
    };

    const display = displays[eventType];
    if (display) return display;

    if (status === 'FAILED') {
      return {
        label: 'Opération échouée',
        mobileMessage: 'Cette opération a échoué. Veuillez réessayer ou contacter le support EDUKIA.',
        severity: 'ERROR',
        nextAction: 'CONTACT_SUPPORT',
        isTerminal: false,
      };
    }

    if (status === 'COMPLETED' || status === 'PAID' || status === 'VERIFIED' || status === 'DELIVERED') {
      return {
        label: 'Opération réussie',
        mobileMessage: 'Cette étape a été réalisée avec succès.',
        severity: 'SUCCESS',
        nextAction: 'NONE',
        isTerminal: false,
      };
    }

    if (status === 'REJECTED' || status === 'CANCELLED' || status === 'LOCKED') {
      return {
        label: 'Action requise',
        mobileMessage: 'Cette opération nécessite une attention particulière. Consultez les détails ou contactez le support EDUKIA.',
        severity: 'WARNING',
        nextAction: 'CONTACT_SUPPORT',
        isTerminal: false,
      };
    }

    return {
      label: 'Mise à jour du processus',
      mobileMessage: 'Votre processus de retrait a été mis à jour.',
      severity: 'INFO',
      nextAction: 'NONE',
      isTerminal: false,
    };
  }

  async findWithPaymentDetailsByUserId(userId: number, page = 1, limit = 50) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

    const [rows, total] = await this.repo.createQueryBuilder('w')
      .leftJoin(WalletEntity, 'wallet', 'wallet.id = w.walletId')
      .leftJoinAndMapOne('w.paymentAccount', UserPaymentAccountEntity, 'account', 'account.id = w.paymentAccountId')
      .leftJoinAndMapMany('w.paymentExecutions', PaymentExecutionEntity, 'execution', 'execution.withdrawalRequestId = w.id')
      .where('wallet.userId = :userId', { userId })
      .orderBy('w.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data: rows.map((row: any) => ({
        id: row.id,
        walletId: row.walletId,
        amount: Number(row.amount),
        fees: Number(row.fees),
        netAmount: Number(row.netAmount),
        status: row.status,
        securityStatus: row.securityStatus,
        securityReviewReason: row.securityReviewReason,
        securityReviewedBy: row.securityReviewedBy,
        securityReviewedAt: row.securityReviewedAt,
        otpLockedAt: row.otpLockedAt,
        otpUnlockedAt: row.otpUnlockedAt,
        paymentMethod: row.paymentMethod,
        paymentAccountId: row.paymentAccountId,
        paymentDeadline: row.paymentDeadline,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        paymentAccount: row.paymentAccount ? {
          id: row.paymentAccount.id,
          operator: row.paymentAccount.operator,
          phoneNumber: row.paymentAccount.phoneNumber,
          accountName: row.paymentAccount.accountName,
          verified: row.paymentAccount.verified,
        } : null,
        paymentExecutions: (row.paymentExecutions || []).map((execution: any) => ({
          id: execution.id,
          provider: execution.provider,
          transactionReference: execution.transactionReference,
          phoneNumber: execution.phoneNumber,
          paidAmount: Number(execution.paidAmount),
          status: execution.status,
          paidAt: execution.paidAt,
          createdAt: execution.createdAt,
        })),
      })),
      total,
    };
  }

  async approve(id: string, adminId: number, deadline?: Date | null): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    if (row.status !== WithdrawalStatus.PENDING) throw new BadRequestException('Seule une demande validée par OTP et en attente peut être approuvée');
    row.status = WithdrawalStatus.APPROVED;
    row.approvedBy = adminId;
    row.approvedAt = new Date();
    row.paymentDeadline = deadline ?? row.paymentDeadline;
    return this.map(await this.repo.save(row));
  }

  async reject(id: string, adminId: number, reason: string): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    if ([WithdrawalStatus.PAID, WithdrawalStatus.REJECTED, WithdrawalStatus.CANCELLED].includes(row.status)) throw new BadRequestException('Cette demande ne peut plus être rejetée');
    row.status = WithdrawalStatus.REJECTED;
    row.rejectedBy = adminId;
    row.rejectedAt = new Date();
    row.rejectedReason = reason;
    return this.map(await this.repo.save(row));
  }

  async markPending(id: string): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    if (row.status !== WithdrawalStatus.OTP_PENDING) throw new BadRequestException('Cette demande ne peut plus être validée par OTP');
    row.status = WithdrawalStatus.PENDING;
    row.securityStatus = WithdrawalSecurityStatus.NORMAL;
    return this.map(await this.repo.save(row));
  }

  async markSecurityReviewRequired(id: string, reason: string): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    row.status = WithdrawalStatus.SECURITY_REVIEW_REQUIRED;
    row.securityStatus = WithdrawalSecurityStatus.UNDER_REVIEW;
    row.securityReviewReason = reason;
    row.otpLockedAt = new Date();
    return this.map(await this.repo.save(row));
  }

  async unlockOtpSecurityReview(id: string, adminId: number, reason: string): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    if (row.status !== WithdrawalStatus.SECURITY_REVIEW_REQUIRED) {
      throw new BadRequestException('Cette demande ne nécessite pas de déblocage OTP');
    }
    row.status = WithdrawalStatus.OTP_PENDING;
    row.securityStatus = WithdrawalSecurityStatus.UNLOCKED;
    row.securityReviewedBy = adminId;
    row.securityReviewedAt = new Date();
    row.otpUnlockedAt = new Date();
    row.securityReviewReason = reason;
    return this.map(await this.repo.save(row));
  }

  async markPaid(id: string): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    row.status = WithdrawalStatus.PAID;
    return this.map(await this.repo.save(row));
  }

  private toDateOrNull(value?: Date | string | null): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private walletTransactionTitle(type: WalletTransactionType): string {
    switch (type) {
      case WalletTransactionType.REWARD:
        return 'Wallet crédité';
      case WalletTransactionType.RELEASE:
        return 'Fonds libérés';
      case WalletTransactionType.WITHDRAW:
        return 'Wallet débité';
      case WalletTransactionType.ADJUSTMENT:
        return 'Ajustement wallet';
      default:
        return 'Transaction wallet';
    }
  }

  private otpDeliveryTitle(status: OtpDeliveryStatus): string {
    switch (status) {
      case OtpDeliveryStatus.SENT_TO_PROVIDER:
        return 'OTP transmis à Infobip';
      case OtpDeliveryStatus.DELIVERED:
        return 'OTP livré au téléphone';
      case OtpDeliveryStatus.UNDELIVERED:
        return 'OTP non livré';
      case OtpDeliveryStatus.FAILED:
        return 'Échec de livraison OTP';
      case OtpDeliveryStatus.DELIVERY_UNKNOWN:
        return 'Livraison OTP inconnue';
      case OtpDeliveryStatus.DELIVERY_TIMEOUT:
        return 'Délai de livraison OTP dépassé';
      default:
        return 'Statut de livraison OTP mis à jour';
    }
  }

  private eventPriority(eventType: string): number {
    const priority: Record<string, number> = {
      WITHDRAWAL_CREATED: 10,
      WITHDRAWAL_OTP_SENT: 20,
      WITHDRAWAL_OTP_RESENT: 30,
      WITHDRAWAL_OTP_VERIFIED: 40,
      WITHDRAWAL_PENDING_AFTER_OTP: 50,
      WITHDRAWAL_APPROVED: 60,
      PAYMENT_EXECUTION_COMPLETED: 70,
      WITHDRAWAL_PAID: 80,
      WALLET_TRANSACTION_WITHDRAW: 90,
    };
    return priority[eventType] ?? 0;
  }

  private otpMetadata(otp: WithdrawalOtpEntity): Record<string, unknown> {
    return {
      provider: otp.provider,
      phoneNumber: otp.phoneNumber,
      attemptCount: otp.attemptCount,
      maxAttempts: otp.maxAttempts,
      resendCount: otp.resendCount,
      expiresAt: otp.expiresAt,
      consumedAt: otp.consumedAt ?? null,
      deliveryStatus: otp.deliveryStatus ?? null,
      providerMessageId: otp.providerMessageId ?? null,
      providerBulkId: otp.providerBulkId ?? null,
      providerStatusName: otp.providerStatusName ?? null,
      providerStatusGroupName: otp.providerStatusGroupName ?? null,
      providerStatusDescription: otp.providerStatusDescription ?? null,
      deliveryErrorCode: otp.deliveryErrorCode ?? null,
      deliveryErrorMessage: otp.deliveryErrorMessage ?? null,
      failureReason: otp.failureReason ?? null,
    };
  }

  private map(row: WithdrawalRequestEntity): WithdrawalRequestModel {
    return {
      id: row.id,
      walletId: row.walletId,
      amount: Number(row.amount),
      fees: Number(row.fees),
      netAmount: Number(row.netAmount),
      status: row.status,
      securityStatus: row.securityStatus,
      securityReviewReason: row.securityReviewReason,
      securityReviewedBy: row.securityReviewedBy,
      securityReviewedAt: row.securityReviewedAt,
      otpLockedAt: row.otpLockedAt,
      otpUnlockedAt: row.otpUnlockedAt,
      paymentMethod: row.paymentMethod,
      paymentAccountId: row.paymentAccountId,
      paymentDeadline: row.paymentDeadline,
      createdAt: row.createdAt,
    };
  }

  async sumPaidAmount(walletId: string, from: Date, to: Date): Promise<number> {
    const result = await this.repo.createQueryBuilder('w')
      .select('COALESCE(SUM(w.amount), 0)', 'sum')
      .where('w.walletId = :walletId', { walletId })
      .andWhere('w.status = :status', { status: WithdrawalStatus.PAID })
      .andWhere('w.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne();
    return Number(result?.sum ?? 0);
  }

  countPaid(walletId: string, from: Date, to: Date): Promise<number> {
    return this.repo.count({ where: { walletId, status: WithdrawalStatus.PAID, createdAt: Between(from, to) } });
  }

  async getStatisticsByWalletId(walletId: string) {
    const rows = await this.repo.createQueryBuilder('w')
      .select('w.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(w.amount), 0)', 'amount')
      .where('w.walletId = :walletId', { walletId })
      .groupBy('w.status')
      .getRawMany();

    const byStatus = Object.fromEntries(rows.map((row) => [row.status, { count: Number(row.count), amount: Number(row.amount) }]));
    const count = (status: WithdrawalStatus) => byStatus[status]?.count ?? 0;
    const amount = (status: WithdrawalStatus) => byStatus[status]?.amount ?? 0;

    return {
      totalRequests: rows.reduce((sum, row) => sum + Number(row.count), 0),
      openRequests: [
        WithdrawalStatus.OTP_PENDING,
        WithdrawalStatus.PENDING,
        WithdrawalStatus.APPROVED,
        WithdrawalStatus.PROCESSING,
        WithdrawalStatus.SECURITY_REVIEW_REQUIRED,
      ].reduce((sum, status) => sum + count(status), 0),
      pendingRequests: count(WithdrawalStatus.PENDING),
      approvedRequests: count(WithdrawalStatus.APPROVED),
      processingRequests: count(WithdrawalStatus.PROCESSING),
      paidRequests: count(WithdrawalStatus.PAID),
      rejectedRequests: count(WithdrawalStatus.REJECTED),
      cancelledRequests: count(WithdrawalStatus.CANCELLED),
      otpPendingRequests: count(WithdrawalStatus.OTP_PENDING),
      securityReviewRequiredRequests: count(WithdrawalStatus.SECURITY_REVIEW_REQUIRED),
      totalRequestedAmount: rows.reduce((sum, row) => sum + Number(row.amount), 0),
      totalPaidAmount: amount(WithdrawalStatus.PAID),
      totalRejectedAmount: amount(WithdrawalStatus.REJECTED),
    };
  }
}

@Injectable()
export class TypeOrmWithdrawalOtpRepository implements WithdrawalOtpRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<WithdrawalOtpEntity> { return this.resolver.getRepository(WithdrawalOtpEntity); }

  async create(data: Parameters<WithdrawalOtpRepositoryPort['create']>[0]): Promise<WithdrawalOtpModel> {
    const entity = this.repo.create({
      ...data,
      lastSentAt: new Date(),
      deliveryStatus: data.deliveryStatus ?? OtpDeliveryStatus.CREATED,
    } as DeepPartial<WithdrawalOtpEntity>);
    return this.map(await this.repo.save(entity));
  }

  async findLatestByWithdrawalId(withdrawalRequestId: string): Promise<WithdrawalOtpModel | null> {
    const row = await this.repo.findOne({ where: { withdrawalRequestId }, order: { createdAt: 'DESC' } });
    return row ? this.map(row) : null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<WithdrawalOtpModel | null> {
    const row = await this.repo.findOne({ where: { providerMessageId } });
    return row ? this.map(row) : null;
  }

  async findPendingDeliveryChecks(limit = 50): Promise<WithdrawalOtpModel[]> {
    const rows = await this.repo.find({
      where: {
        provider: 'infobip',
        status: WithdrawalOtpStatus.SENT,
        deliveryStatus: In([
          OtpDeliveryStatus.SENT_TO_PROVIDER,
          OtpDeliveryStatus.DELIVERY_UNKNOWN,
        ]),
        nextDeliveryCheckAt: LessThanOrEqual(new Date()),
      },
      order: { nextDeliveryCheckAt: 'ASC', createdAt: 'ASC' },
      take: limit,
    });
    return rows.map((row) => this.map(row));
  }

  async incrementAttempt(id: string): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');
    row.attemptCount += 1;
    return this.map(await this.repo.save(row));
  }

  async incrementResend(id: string): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');
    row.resendCount += 1;
    row.lastSentAt = new Date();
    return this.map(await this.repo.save(row));
  }

  async markVerified(id: string): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');
    row.status = WithdrawalOtpStatus.VERIFIED;
    row.consumedAt = new Date();
    return this.map(await this.repo.save(row));
  }

  async markExpired(id: string): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');
    row.status = WithdrawalOtpStatus.EXPIRED;
    return this.map(await this.repo.save(row));
  }

  async markLocked(id: string, reason: string): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');
    row.status = WithdrawalOtpStatus.LOCKED;
    row.lockedAt = new Date();
    row.lockedReason = reason;
    return this.map(await this.repo.save(row));
  }

  async expireActiveByWithdrawalId(withdrawalRequestId: string): Promise<void> {
    await this.repo.update(
      { withdrawalRequestId, status: In([WithdrawalOtpStatus.SENT, WithdrawalOtpStatus.FAILED]) },
      { status: WithdrawalOtpStatus.EXPIRED },
    );
  }

  async markUnlocked(id: string, adminId: number, reason: string): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');
    row.unlockedAt = new Date();
    row.unlockedBy = adminId;
    row.unlockReason = reason;
    return this.map(await this.repo.save(row));
  }

  async updateProviderDeliveryStatus(id: string, data: Parameters<WithdrawalOtpRepositoryPort['updateProviderDeliveryStatus']>[1]): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');

    row.deliveryStatus = data.deliveryStatus;
    row.providerStatusName = data.providerStatusName ?? row.providerStatusName;
    row.providerStatusGroupName = data.providerStatusGroupName ?? row.providerStatusGroupName;
    row.providerStatusDescription = data.providerStatusDescription ?? row.providerStatusDescription;
    row.deliveryErrorCode = data.deliveryErrorCode ?? row.deliveryErrorCode;
    row.deliveryErrorMessage = data.deliveryErrorMessage ?? row.deliveryErrorMessage;
    row.deliveredAt = data.deliveredAt ?? row.deliveredAt;
    row.failedAt = data.failedAt ?? row.failedAt;
    row.lastProviderCallbackAt = data.lastProviderCallbackAt ?? new Date();
    row.nextDeliveryCheckAt = data.nextDeliveryCheckAt ?? null;

    if (data.status) row.status = data.status;
    if (data.failureReason) row.failureReason = data.failureReason;

    return this.map(await this.repo.save(row));
  }

  async markDeliveryCheckAttempt(id: string, nextDeliveryCheckAt?: Date | null): Promise<WithdrawalOtpModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('OTP introuvable');
    row.deliveryCheckCount += 1;
    row.nextDeliveryCheckAt = nextDeliveryCheckAt ?? null;
    row.lastProviderCallbackAt = new Date();
    return this.map(await this.repo.save(row));
  }

  private map(row: WithdrawalOtpEntity): WithdrawalOtpModel {
    return {
      id: row.id,
      withdrawalRequestId: row.withdrawalRequestId,
      userId: row.userId,
      phoneNumber: row.phoneNumber,
      codeHash: row.codeHash,
      debugCode: row.debugCode,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
      attemptCount: row.attemptCount,
      maxAttempts: row.maxAttempts,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.providerMessageId,
      providerBulkId: row.providerBulkId,
      failureReason: row.failureReason,
      resendCount: row.resendCount,
      lastSentAt: row.lastSentAt,
      lockedAt: row.lockedAt,
      lockedReason: row.lockedReason,
      unlockedAt: row.unlockedAt,
      unlockedBy: row.unlockedBy,
      unlockReason: row.unlockReason,
      deliveryStatus: row.deliveryStatus,
      providerStatusName: row.providerStatusName,
      providerStatusGroupName: row.providerStatusGroupName,
      providerStatusDescription: row.providerStatusDescription,
      deliveryErrorCode: row.deliveryErrorCode,
      deliveryErrorMessage: row.deliveryErrorMessage,
      deliveredAt: row.deliveredAt,
      failedAt: row.failedAt,
      lastProviderCallbackAt: row.lastProviderCallbackAt,
      deliveryCheckCount: row.deliveryCheckCount,
      nextDeliveryCheckAt: row.nextDeliveryCheckAt,
      createdAt: row.createdAt,
    };
  }
}

@Injectable()
export class TypeOrmUserPaymentAccountRepository implements UserPaymentAccountRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<UserPaymentAccountEntity> { return this.resolver.getRepository(UserPaymentAccountEntity); }
  private get historyRepo(): Repository<UserPaymentAccountHistoryEntity> { return this.resolver.getRepository(UserPaymentAccountHistoryEntity); }

  async upsertDefault(data: Parameters<UserPaymentAccountRepositoryPort['upsertDefault']>[0]): Promise<UserPaymentAccountModel> {
    const existing = await this.repo.findOne({ where: { userId: data.userId, isDefault: true } });
    if (existing) {
      await this.historyRepo.save(this.historyRepo.create({
        userId: data.userId,
        oldPhoneNumber: existing.phoneNumber,
        newPhoneNumber: data.phoneNumber,
        oldOperator: existing.operator,
        newOperator: data.operator,
        changedBy: data.changedBy,
      }));
      existing.operator = data.operator;
      existing.phoneNumber = data.phoneNumber;
      existing.accountName = data.accountName;
      existing.verified = false;
      return this.map(await this.repo.save(existing));
    }

    await this.repo.update({ userId: data.userId }, { isDefault: false });
    const entity = this.repo.create({
      userId: data.userId,
      operator: data.operator,
      phoneNumber: data.phoneNumber,
      accountName: data.accountName,
      isDefault: true,
      verified: false,
    });
    return this.map(await this.repo.save(entity));
  }

  async findDefaultByUserId(userId: number): Promise<UserPaymentAccountModel | null> {
    const row = await this.repo.findOne({ where: { userId, isDefault: true } });
    return row ? this.map(row) : null;
  }

  async findByUserId(userId: number): Promise<UserPaymentAccountModel[]> {
    const rows = await this.repo.find({ where: { userId }, order: { isDefault: 'DESC', createdAt: 'DESC' } });
    return rows.map((row) => this.map(row));
  }

  private map(row: UserPaymentAccountEntity): UserPaymentAccountModel {
    return {
      id: row.id,
      userId: row.userId,
      operator: row.operator,
      phoneNumber: row.phoneNumber,
      accountName: row.accountName,
      isDefault: row.isDefault,
      verified: row.verified,
    };
  }
}

@Injectable()
export class TypeOrmPaymentExecutionRepository implements PaymentExecutionRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<PaymentExecutionEntity> { return this.resolver.getRepository(PaymentExecutionEntity); }
  private get proofRepo(): Repository<PaymentProofEntity> { return this.resolver.getRepository(PaymentProofEntity); }

  existsByTransactionReference(reference: string): Promise<boolean> {
    return this.repo.exist({ where: { transactionReference: reference } });
  }

  async create(data: Parameters<PaymentExecutionRepositoryPort['create']>[0]) {
    const { proof, ...executionData } = data;
    const entity = this.repo.create(executionData as DeepPartial<PaymentExecutionEntity>);
    const saved = await this.repo.save(entity);

    if (proof) {
      const proofEntity = this.proofRepo.create({
        ...proof,
        paymentExecutionId: saved.id,
      } as DeepPartial<PaymentProofEntity>);
      await this.proofRepo.save(proofEntity);
    }

    return { id: saved.id, createdAt: saved.createdAt };
  }

  async findByWithdrawalIds(withdrawalRequestIds: string[]) {
    if (!withdrawalRequestIds.length) return [];
    return this.repo.find({ where: { withdrawalRequestId: In(withdrawalRequestIds) }, order: { createdAt: 'DESC' } });
  }
}

@Injectable()
export class TypeOrmPaymentConfigurationRepository implements PaymentConfigurationRepositoryPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<PaymentConfigurationEntity> { return this.resolver.getRepository(PaymentConfigurationEntity); }

  async getActive(): Promise<PaymentConfigurationModel> {
    let config = await this.repo.findOne({ where: { isActive: true }, order: { createdAt: 'DESC' } });
    if (!config) config = await this.repo.save(this.repo.create({ isActive: true }));
    return config as PaymentConfigurationModel;
  }

  async update(configuration: Partial<PaymentConfigurationModel>, updatedBy: number) {
    const active = await this.getActive();
    await this.repo.update(active.id!, { ...configuration, updatedBy });
    return this.getActive();
  }
}

@Injectable()
export class UtilisateursUserProfileAdapter implements UserProfilePort {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  async getPaymentProfile(userId: number) {
    const user: any = await this.utilisateursService.findOne(String(userId));
    const verification = await this.utilisateursService.isEmailVerified(userId);
    return {
      id: user.id,
      email: user.email,
      telephone: user.telephone,
      isEmailVerified: verification.isVerified,
      isDisabled: user.est_desactive ?? false,
    };
  }
}

@Injectable()
export class TypeOrmPaymentNotificationAdapter implements PaymentNotificationPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<PaymentNotificationEntity> { return this.resolver.getRepository(PaymentNotificationEntity); }

  async notifyUser(payload: Parameters<PaymentNotificationPort['notifyUser']>[0]) {
    const entity = this.repo.create({ ...payload, forAdmins: false, isRead: false } as DeepPartial<PaymentNotificationEntity>);
    await this.repo.save(entity);
  }

  async notifyAdmins(payload: Parameters<PaymentNotificationPort['notifyAdmins']>[0]) {
    const entity = this.repo.create({ ...payload, userId: null, forAdmins: true, isRead: false } as DeepPartial<PaymentNotificationEntity>);
    await this.repo.save(entity);
  }
}

@Injectable()
export class TypeOrmPaymentAuditLogAdapter implements PaymentAuditLogPort {
  constructor(private readonly resolver: DataSourceResolver) {}
  private get repo(): Repository<PaymentAuditLogEntity> { return this.resolver.getRepository(PaymentAuditLogEntity); }

  async log(payload: Parameters<PaymentAuditLogPort['log']>[0]) {
    const entity = this.repo.create(payload as DeepPartial<PaymentAuditLogEntity>);
    await this.repo.save(entity);
  }
}
