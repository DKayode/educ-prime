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
  rewardPerExam: number;
  rewardPerConcours: number;
  rewardPerExamenNational: number;
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
};
