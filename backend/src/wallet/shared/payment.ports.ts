import {
  FeeType,
  MobileMoneyProvider,
  OtpDeliveryStatus,
  PaymentExecutionStatus,
  PaymentMethod,
  PaymentNotificationType,
  WalletStatus,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalSecurityStatus,
  WithdrawalStatus,
} from './payment.enums';
import { WithdrawalOtpStatus } from '../otp/entities/withdrawal-otp.entity';


export type WalletActivityHistorySource =
  | 'WALLET_TRANSACTION'
  | 'WITHDRAWAL_REQUEST'
  | 'WITHDRAWAL_OTP'
  | 'PAYMENT_EXECUTION';

export type WalletActivityHistoryCategory =
  | 'FINANCIAL'
  | 'WITHDRAWAL_PROCESS'
  | 'OTP'
  | 'PAYMENT';

export type WalletTimelineSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export type WalletTimelineNextAction =
  | 'NONE'
  | 'ENTER_OTP'
  | 'RESEND_OTP'
  | 'WAIT_ADMIN_REVIEW'
  | 'WAIT_ADMIN_APPROVAL'
  | 'WAIT_PAYMENT'
  | 'CONTACT_SUPPORT'
  | 'VIEW_PAYMENT_PROOF';

export interface WalletActivityHistoryItemModel {
  id: string;
  walletId: string;
  source: WalletActivityHistorySource;
  category: WalletActivityHistoryCategory;
  eventType: string;
  title: string;
  description?: string | null;

  /**
   * Libellé court prêt à afficher côté mobile.
   * Exemple : "Code OTP vérifié".
   */
  label?: string;

  /**
   * Message métier prêt à afficher côté mobile.
   * Le mobile peut l'utiliser directement au lieu de reconstruire les messages à partir de status/eventType.
   */
  mobileMessage?: string;

  /**
   * Niveau visuel recommandé pour le mobile.
   */
  severity?: WalletTimelineSeverity;

  /**
   * Action UI recommandée pour guider l'utilisateur.
   */
  nextAction?: WalletTimelineNextAction;

  /**
   * true si cette étape clôture le processus concerné.
   */
  isTerminal?: boolean;

  occurredAt: Date;
  withdrawalRequestId?: string | null;
  walletTransactionId?: string | null;
  otpId?: string | null;
  paymentExecutionId?: string | null;
  amount?: number | null;
  fees?: number | null;
  netAmount?: number | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  reference?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PaymentConfigurationModel {
  id?: string;
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawFee: number;
  withdrawFeeType: FeeType;
  rewardPerExam: number;
  rewardPerConcours: number;
  rewardPerExamenNational: number;
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
  otpEnabled: boolean;
  otpLength: number;
  otpTtlMinutes: number;
  otpMaxAttempts: number;
  otpResendCooldownSeconds: number;
  otpMaxResends: number;
  otpLockDurationMinutes: number;
  otpRequireAdminUnlock: boolean;
  otpAutoUnlockEnabled: boolean;
  otpBlockWithdrawalCreation: boolean;
  otpProvider: string;
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
  findByWalletIdForAdmin(walletId: string, page?: number, limit?: number): Promise<{ data: WalletTransactionModel[]; total: number }>;
  sumByType(walletId: string, type: WalletTransactionType): Promise<number>;
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
  securityStatus?: WithdrawalSecurityStatus;
  securityReviewReason?: string | null;
  securityReviewedBy?: number | null;
  securityReviewedAt?: Date | null;
  otpLockedAt?: Date | null;
  otpUnlockedAt?: Date | null;
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
    status?: WithdrawalStatus;
  }): Promise<WithdrawalRequestModel>;
  findById(id: string): Promise<WithdrawalRequestModel | null>;
  findOpenByWalletId(walletId: string): Promise<WithdrawalRequestModel | null>;
  findForAdmin(status?: WithdrawalStatus, page?: number, limit?: number): Promise<{ data: WithdrawalRequestModel[]; total: number }>;
  findByWalletId(walletId: string, page?: number, limit?: number): Promise<{ data: WithdrawalRequestModel[]; total: number }>;
  findWalletActivityHistory(walletId: string, page?: number, limit?: number): Promise<{ data: WalletActivityHistoryItemModel[]; total: number }>;
  findWithPaymentDetailsByUserId(userId: number, page?: number, limit?: number): Promise<{ data: any[]; total: number }>;
  approve(id: string, adminId: number, deadline?: Date | null): Promise<WithdrawalRequestModel>;
  reject(id: string, adminId: number, reason: string): Promise<WithdrawalRequestModel>;
  markPending(id: string): Promise<WithdrawalRequestModel>;
  markSecurityReviewRequired(id: string, reason: string): Promise<WithdrawalRequestModel>;
  unlockOtpSecurityReview(id: string, adminId: number, reason: string): Promise<WithdrawalRequestModel>;
  markPaid(id: string): Promise<WithdrawalRequestModel>;
  sumPaidAmount(walletId: string, from: Date, to: Date): Promise<number>;
  countPaid(walletId: string, from: Date, to: Date): Promise<number>;
  getStatisticsByWalletId(walletId: string): Promise<{
    totalRequests: number;
    openRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    processingRequests: number;
    paidRequests: number;
    rejectedRequests: number;
    cancelledRequests: number;
    otpPendingRequests: number;
    securityReviewRequiredRequests: number;
    totalRequestedAmount: number;
    totalPaidAmount: number;
    totalRejectedAmount: number;
  }>;
}

export interface WithdrawalOtpModel {
  id: string;
  withdrawalRequestId: string;
  userId: number;
  phoneNumber: string;
  codeHash: string;
  debugCode?: string | null;
  expiresAt: Date;
  consumedAt?: Date | null;
  attemptCount: number;
  maxAttempts: number;
  status: WithdrawalOtpStatus;
  provider: string;
  providerMessageId?: string | null;
  providerBulkId?: string | null;
  failureReason?: string | null;
  resendCount?: number;
  lastSentAt?: Date | null;
  lockedAt?: Date | null;
  lockedReason?: string | null;
  unlockedAt?: Date | null;
  unlockedBy?: number | null;
  unlockReason?: string | null;
  deliveryStatus?: OtpDeliveryStatus;
  providerStatusName?: string | null;
  providerStatusGroupName?: string | null;
  providerStatusDescription?: string | null;
  deliveryErrorCode?: string | null;
  deliveryErrorMessage?: string | null;
  deliveredAt?: Date | null;
  failedAt?: Date | null;
  lastProviderCallbackAt?: Date | null;
  deliveryCheckCount?: number;
  nextDeliveryCheckAt?: Date | null;
  createdAt: Date;
}

export interface WithdrawalOtpRepositoryPort {
  create(data: {
    withdrawalRequestId: string;
    userId: number;
    phoneNumber: string;
    codeHash: string;
    debugCode?: string | null;
    expiresAt: Date;
    maxAttempts: number;
    provider: string;
    providerMessageId?: string | null;
    providerBulkId?: string | null;
    failureReason?: string | null;
    resendCount?: number;
    status?: WithdrawalOtpStatus;
    deliveryStatus?: OtpDeliveryStatus;
    nextDeliveryCheckAt?: Date | null;
  }): Promise<WithdrawalOtpModel>;
  findLatestByWithdrawalId(withdrawalRequestId: string): Promise<WithdrawalOtpModel | null>;
  findByProviderMessageId(providerMessageId: string): Promise<WithdrawalOtpModel | null>;
  findPendingDeliveryChecks(limit?: number): Promise<WithdrawalOtpModel[]>;
  incrementAttempt(id: string): Promise<WithdrawalOtpModel>;
  incrementResend(id: string): Promise<WithdrawalOtpModel>;
  markVerified(id: string): Promise<WithdrawalOtpModel>;
  markExpired(id: string): Promise<WithdrawalOtpModel>;
  markLocked(id: string, reason: string): Promise<WithdrawalOtpModel>;
  expireActiveByWithdrawalId(withdrawalRequestId: string): Promise<void>;
  markUnlocked(id: string, adminId: number, reason: string): Promise<WithdrawalOtpModel>;
  updateProviderDeliveryStatus(id: string, data: {
    deliveryStatus: OtpDeliveryStatus;
    providerStatusName?: string | null;
    providerStatusGroupName?: string | null;
    providerStatusDescription?: string | null;
    deliveryErrorCode?: string | null;
    deliveryErrorMessage?: string | null;
    deliveredAt?: Date | null;
    failedAt?: Date | null;
    lastProviderCallbackAt?: Date | null;
    nextDeliveryCheckAt?: Date | null;
    status?: WithdrawalOtpStatus;
    failureReason?: string | null;
  }): Promise<WithdrawalOtpModel>;
  markDeliveryCheckAttempt(id: string, nextDeliveryCheckAt?: Date | null): Promise<WithdrawalOtpModel>;
}

export interface OtpSmsSenderPort {
  sendOtp(payload: {
    phoneNumber: string;
    code: string;
    message: string;
    provider?: string;
    withdrawalRequestId?: string;
    userId?: number;
  }): Promise<{
    provider: string;
    messageId?: string | null;
    bulkId?: string | null;
    deliveryStatus?: OtpDeliveryStatus;
  }>;
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
  findByWithdrawalIds(withdrawalRequestIds: string[]): Promise<any[]>;
}

export interface PaymentConfigurationRepositoryPort {
  getActive(): Promise<PaymentConfigurationModel>;
  update(configuration: Partial<PaymentConfigurationModel>, updatedBy: number): Promise<PaymentConfigurationModel>;
}

export interface PaymentUserProfile {
  id: number;
  uuid?: string | null;
  profil?: string | null;
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
