import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_EXECUTION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  WALLET_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentAuditLogPort,
  PaymentConfigurationRepositoryPort,
  PaymentExecutionRepositoryPort,
  PaymentNotificationPort,
  WalletRepositoryPort,
  WalletTransactionRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import {
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

@Injectable()
export class ListAdminWithdrawalsUseCase {
  constructor(@Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort) {}
  execute(status?: WithdrawalStatus, page = 1, limit = 20) { return this.withdrawals.findForAdmin(status, page, limit); }
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
