import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Between, DeepPartial, In, Repository } from 'typeorm';
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
  WalletModel,
  WalletRepositoryPort,
  WalletRestrictionModel,
  WalletRestrictionRepositoryPort,
  WalletTransactionModel,
  WalletTransactionRepositoryPort,
  WithdrawalRequestModel,
  WithdrawalRequestRepositoryPort,
} from '../shared/payment.ports';
import { WalletStatus, WithdrawalStatus } from '../shared/payment.enums';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { WalletTransactionEntity } from '../wallet/entities/wallet-transaction.entity';
import { WalletRestrictionEntity } from '../wallet/entities/wallet-restriction.entity';
import { WithdrawalRequestEntity } from '../user-payment/entities/withdrawal-request.entity';
import { UserPaymentAccountEntity } from '../user-payment/entities/user-payment-account.entity';
import { UserPaymentAccountHistoryEntity } from '../user-payment/entities/user-payment-account-history.entity';
import { PaymentExecutionEntity } from '../user-payment/entities/payment-execution.entity';
import { PaymentProofEntity } from '../user-payment/entities/payment-proof.entity';
import { PaymentConfigurationEntity } from '../user-payment/entities/payment-configuration.entity';
import { PaymentNotificationEntity } from '../user-payment/entities/payment-notification.entity';
import { PaymentAuditLogEntity } from '../user-payment/entities/payment-audit-log.entity';

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
    const saved = await this.repo.save(entity);
    return this.map(saved);
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
    const row = await this.repo.findOne({ where: { walletId, status: In([WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING]) } });
    return row ? this.map(row) : null;
  }

  async findForAdmin(status?: WithdrawalStatus, page = 1, limit = 20) {
    const where = status ? { status } : {};
    const [data, total] = await this.repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { data: data.map((row) => this.map(row)), total };
  }

  async approve(id: string, adminId: number, deadline?: Date | null): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    if (row.status !== WithdrawalStatus.PENDING) throw new BadRequestException('Seule une demande en attente peut être approuvée');
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

  async markPaid(id: string): Promise<WithdrawalRequestModel> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Demande de retrait introuvable');
    row.status = WithdrawalStatus.PAID;
    return this.map(await this.repo.save(row));
  }

  private map(row: WithdrawalRequestEntity): WithdrawalRequestModel {
    return {
      id: row.id,
      walletId: row.walletId,
      amount: Number(row.amount),
      fees: Number(row.fees),
      netAmount: Number(row.netAmount),
      status: row.status,
      paymentMethod: row.paymentMethod,
      paymentAccountId: row.paymentAccountId,
      paymentDeadline: row.paymentDeadline,
      createdAt: row.createdAt,
    };
  }

  async sumPaidAmount(walletId: string, from: Date, to: Date): Promise<number> {
    const result = await this.repo.createQueryBuilder('w')
      .select('COALESCE(SUM(w.amount), 0)', 'sum')
      .where('w.wallet_id = :walletId', { walletId })
      .andWhere('w.status = :status', { status: WithdrawalStatus.PAID })
      .andWhere('w.created_at BETWEEN :from AND :to', { from, to })
      .getRawOne();
    return Number(result?.sum ?? 0);
  }

  countPaid(walletId: string, from: Date, to: Date): Promise<number> {
    return this.repo.count({ where: { walletId, status: WithdrawalStatus.PAID, createdAt: Between(from, to) } });
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
