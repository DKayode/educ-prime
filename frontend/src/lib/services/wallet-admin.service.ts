import { api } from '../api';

export type WithdrawalStatus =
  | 'PENDING' | 'OTP_PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED';

export type MobileMoneyProvider = 'MTN_MOMO' | 'MOOV_MONEY' | 'CELTIIS_CASH';

export interface WithdrawalUser {
  id: number;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
}

export interface WithdrawalPaymentAccount {
  operator: MobileMoneyProvider;
  phoneNumber: string;
  accountName?: string | null;
}

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  amount: number;
  fees: number;
  netAmount: number;
  status: WithdrawalStatus;
  paymentMethod: string;
  paymentAccountId?: string | null;
  rejectedReason?: string | null;
  createdAt: string;
  user?: WithdrawalUser | null;
  paymentAccount?: WithdrawalPaymentAccount | null;
}

export interface WithdrawalList {
  data: WithdrawalRequest[];
  total: number;
}

export interface ConfirmPaymentPayload {
  provider: MobileMoneyProvider;
  transactionReference: string;
  phoneNumber: string;   // +229 01XXXXXXXX
  paidAmount: number;
  comment?: string;
}

export type FeeType = 'FIXED' | 'PERCENTAGE';

export interface PaymentConfiguration {
  id: string;
  /** Vestigial: le montant réel vit dans RewardConfiguration (par source). */
  rewardPerExam: number;
  rewardEnabled: boolean;
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawFee: number;
  withdrawFeeType: FeeType;
  withdrawEnabled: boolean;
  walletEnabled: boolean;
  automaticWithdrawal: boolean;
  maintenanceMode: boolean;
  reviewDelayHours: number;
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  minimumWalletBalance: number;
  maxWithdrawPerDay: number;
  maxWithdrawPerWeek: number;
  maxWithdrawPerMonth: number;
  currency: string;
}

export type PaymentConfigurationUpdate = Partial<Omit<PaymentConfiguration, 'id' | 'currency'>>;

// Admin endpoints exposed by the Wallet / UserPayment module. Not country-scoped
// (the ?country= the api client appends is harmless — the wallet controllers
// ignore it).
/** Une source de récompense : le crédit versé quand un contenu chargé est validé. */
export type RewardSourceType = 'EPREUVE' | 'EXAMEN' | 'CONCOURS';

export interface RewardConfiguration {
  id: string;
  rewardSourceTypeId: string;
  rewardSourceTypeCode: RewardSourceType;
  rewardSourceTypeLabel: string;
  rewardAmount: number;
  currency: string;
  rewardEnabled: boolean;
  /** 0 = crédit disponible immédiatement ; > 0 = crédité en attente. */
  reviewDelayHours: number;
  requiresAdminValidation: boolean;
  /** Sur tous les plafonds : 0 = aucune limite. */
  dailyRewardAmountLimit: number;
  monthlyRewardAmountLimit: number;
  maxRewardsPerUserPerDay: number;
  maxRewardsPerUserPerMonth: number;
  isActive: boolean;
  updatedBy?: number | null;
  updatedAt?: string;
}

export type RewardConfigurationUpdate = Partial<
  Pick<
    RewardConfiguration,
    | 'rewardAmount'
    | 'currency'
    | 'rewardEnabled'
    | 'reviewDelayHours'
    | 'requiresAdminValidation'
    | 'dailyRewardAmountLimit'
    | 'monthlyRewardAmountLimit'
    | 'maxRewardsPerUserPerDay'
    | 'maxRewardsPerUserPerMonth'
  >
>;

/** Suivi de livraison du SMS d'OTP envoyé à l'utilisateur lors d'une demande de retrait. */
export type OtpDeliveryState =
  | 'NOT_REQUIRED' | 'CREATED' | 'SENT_TO_PROVIDER' | 'DELIVERED'
  | 'UNDELIVERED' | 'FAILED' | 'DELIVERY_UNKNOWN' | 'DELIVERY_TIMEOUT';

export interface OtpDeliveryDiagnostic {
  level: 'OK' | 'INFO' | 'WARNING' | 'ERROR';
  code: string;
  message: string;
}

export interface WithdrawalOtpDelivery {
  withdrawalRequestId: string;
  otp: {
    status: string;
    provider: string;
    /** Masqué côté serveur. */
    phoneNumber: string;
    deliveryStatus: OtpDeliveryState | null;
    providerStatusName: string | null;
    providerStatusDescription: string | null;
    deliveryErrorCode: string | null;
    deliveryErrorMessage: string | null;
    failureReason: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    attemptCount: number;
    maxAttempts: number;
    resendCount: number;
    expiresAt: string | null;
    lockedAt: string | null;
    lockedReason: string | null;
  } | null;
  diagnostic: OtpDeliveryDiagnostic;
}

export const walletAdminService = {
  listWithdrawals: async (params?: { status?: WithdrawalStatus; page?: number; limit?: number }): Promise<WithdrawalList> => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api.get<WithdrawalList>(`/user-payment/admin/withdrawals${qs ? `?${qs}` : ''}`);
  },

  approve: (id: string) => api.patch(`/user-payment/admin/withdrawals/${id}/approve`, {}),

  reject: (id: string, reason: string) => api.patch(`/user-payment/admin/withdrawals/${id}/reject`, { reason }),

  confirmPayment: (id: string, payload: ConfirmPaymentPayload) =>
    api.patch(`/user-payment/admin/withdrawals/${id}/confirm-payment`, payload),

  getConfiguration: (): Promise<PaymentConfiguration> =>
    api.get<PaymentConfiguration>('/user-payment/admin/configuration'),

  updateConfiguration: (payload: PaymentConfigurationUpdate): Promise<PaymentConfiguration> =>
    api.patch('/user-payment/admin/configuration', payload),

  listRewardConfigurations: (): Promise<RewardConfiguration[]> =>
    api.get<RewardConfiguration[]>('/user-payment/admin/reward-configurations'),

  getRewardConfiguration: (sourceType: RewardSourceType): Promise<RewardConfiguration> =>
    api.get<RewardConfiguration>(`/user-payment/admin/reward-configurations/${sourceType}`),

  updateRewardConfiguration: (
    sourceType: RewardSourceType,
    payload: RewardConfigurationUpdate,
  ): Promise<RewardConfiguration> =>
    api.patch(`/user-payment/admin/reward-configurations/${sourceType}`, payload),

  getOtpDeliveryStatus: (withdrawalId: string): Promise<WithdrawalOtpDelivery> =>
    api.get<WithdrawalOtpDelivery>(`/user-payment/admin/withdrawals/${withdrawalId}/otp-delivery-status`),
};
