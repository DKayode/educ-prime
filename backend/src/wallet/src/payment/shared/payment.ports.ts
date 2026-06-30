import {
  FeeType,
  MobileMoneyProvider,
  PaymentExecutionStatus,
  PaymentMethod,
  PaymentNotificationType,
  WalletStatus,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalStatus,
} from './payment.enums';

export interface PaymentConfigurationModel {
  id?: string;
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawFee: number;
  withdrawFeeType: FeeType;
  rewardPerExam: number;
  currency: string;
  walletEnabled: boolean;
  withdrawEnabled: boolean;
  rewardEnabled: boolean;
  reviewDelayHours: number;
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  kycThreshold: number;
  minimumWalletBalance: number;
  maxWithdrawPerDay: number;
  maxWithdrawPerWeek: number;
  maxWithdrawPerMonth: number;
  automaticWithdrawal: boolean;
  maintenanceMode: boolean;
}

export interface WalletModel {
  id?: string;
  userId: number;
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  status: WalletStatus;
}

export interface WalletRepositoryPort {
  findById(walletId: string): Promise<WalletModel | null>;
  findByUserId(userId: number): Promise<WalletModel | null>;
  createForUser(userId: number, currency: string): Promise<WalletModel>;
  updateBalances(wallet: WalletModel): Promise<WalletModel>;
}

export interface WalletTransactionModel {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  status: WalletTransactionStatus;
  createdAt: Date;
}

export interface WalletTransactionRepositoryPort {
  existsByReference(reference: string): Promise<boolean>;
  create(data: Partial<WalletTransactionModel> & {
    walletId: string;
    type: WalletTransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    availableBalanceAfter: number;
    pendingBalanceAfter: number;
    reference: string;
    description?: string;
    status: WalletTransactionStatus;
    createdBy?: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<WalletTransactionModel>;
  findByWalletId(walletId: string, page?: number, limit?: number): Promise<{ data: WalletTransactionModel[]; total: number }>;
}

export interface WalletRestrictionModel {
  id?: string;
  userId: number;
  canReceiveMoney: boolean;
  canWithdraw: boolean;
  canTransfer: boolean;
  blocked: boolean;
  blockedReason?: string | null;
  blockedUntil?: Date | null;
  blockedBy?: number | null;
}

export interface WalletRestrictionRepositoryPort {
  findByUserId(userId: number): Promise<WalletRestrictionModel | null>;
  ensureForUser(userId: number): Promise<WalletRestrictionModel>;
}

export interface WithdrawalRequestModel {
  id: string;
  walletId: string;
  amount: number;
  fees: number;
  netAmount: number;
  status: WithdrawalStatus;
  paymentMethod: PaymentMethod;
  paymentAccountId?: string | null;
  paymentDeadline?: Date | null;
  createdAt: Date;
}

export interface WithdrawalRequestRepositoryPort {
  create(data: {
    walletId: string;
    amount: number;
    fees: number;
    netAmount: number;
    paymentMethod: PaymentMethod;
    paymentAccountId?: string | null;
    paymentDeadline?: Date | null;
  }): Promise<WithdrawalRequestModel>;
  findById(id: string): Promise<WithdrawalRequestModel | null>;
  findOpenByWalletId(walletId: string): Promise<WithdrawalRequestModel | null>;
  findForAdmin(status?: WithdrawalStatus, page?: number, limit?: number): Promise<{ data: WithdrawalRequestModel[]; total: number }>;
  approve(id: string, adminId: number, deadline?: Date | null): Promise<WithdrawalRequestModel>;
  reject(id: string, adminId: number, reason: string): Promise<WithdrawalRequestModel>;
  markPaid(id: string): Promise<WithdrawalRequestModel>;
  sumPaidAmount(walletId: string, from: Date, to: Date): Promise<number>;
  countPaid(walletId: string, from: Date, to: Date): Promise<number>;
}

export interface UserPaymentAccountModel {
  id: string;
  userId: number;
  operator: MobileMoneyProvider;
  phoneNumber: string;
  accountName: string;
  isDefault: boolean;
  verified: boolean;
}

export interface UserPaymentAccountRepositoryPort {
  upsertDefault(data: {
    userId: number;
    operator: MobileMoneyProvider;
    phoneNumber: string;
    accountName: string;
    changedBy: number;
  }): Promise<UserPaymentAccountModel>;
  findDefaultByUserId(userId: number): Promise<UserPaymentAccountModel | null>;
  findByUserId(userId: number): Promise<UserPaymentAccountModel[]>;
}

export interface PaymentExecutionRepositoryPort {
  existsByTransactionReference(reference: string): Promise<boolean>;
  create(data: {
    withdrawalRequestId: string;
    executedBy: number;
    paymentMethod: PaymentMethod;
    provider: MobileMoneyProvider;
    transactionReference: string;
    phoneNumber: string;
    paidAmount: number;
    comment?: string | null;
    internalNote?: string | null;
    status: PaymentExecutionStatus;
    paidAt: Date;
    proof?: { fileName: string; fileUrl: string; mimeType: string; uploadedBy: number };
  }): Promise<{ id: string; createdAt: Date }>;
}

export interface PaymentConfigurationRepositoryPort {
  getActive(): Promise<PaymentConfigurationModel>;
  update(configuration: Partial<PaymentConfigurationModel>, updatedBy: number): Promise<PaymentConfigurationModel>;
}

export interface PaymentUserProfile {
  id: number;
  email: string;
  telephone?: string | null;
  isEmailVerified: boolean;
  isDisabled?: boolean;
}

export interface UserProfilePort {
  getPaymentProfile(userId: number): Promise<PaymentUserProfile>;
}

export interface PaymentNotificationPort {
  notifyUser(payload: {
    userId?: number | null;
    title: string;
    message: string;
    type: PaymentNotificationType;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  notifyAdmins(payload: {
    title: string;
    message: string;
    type: PaymentNotificationType;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface PaymentAuditLogPort {
  log(payload: {
    adminId?: number | null;
    action: string;
    entity: string;
    entityId?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    ip?: string | null;
  }): Promise<void>;
}
