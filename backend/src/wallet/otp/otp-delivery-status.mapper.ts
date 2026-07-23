import { OtpDeliveryStatus } from '../shared/payment.enums';
import { WithdrawalOtpStatus } from './entities/withdrawal-otp.entity';

export interface ProviderDeliveryStatusInput {
  groupName?: string | null;
  name?: string | null;
  description?: string | null;
  errorName?: string | null;
  errorDescription?: string | null;
}

export function mapInfobipDeliveryStatus(input: ProviderDeliveryStatusInput): {
  deliveryStatus: OtpDeliveryStatus;
  otpStatus?: WithdrawalOtpStatus;
  terminal: boolean;
  userSafeMessage?: string;
} {
  const group = String(input.groupName || '').toUpperCase();
  const name = String(input.name || '').toUpperCase();

  if (group === 'DELIVERED' || name.includes('DELIVERED')) {
    return { deliveryStatus: OtpDeliveryStatus.DELIVERED, terminal: true };
  }

  if (
    group === 'UNDELIVERABLE' ||
    group === 'REJECTED' ||
    group === 'EXPIRED' ||
    name.includes('UNDELIVER') ||
    name.includes('REJECT') ||
    name.includes('EXPIRED')
  ) {
    return {
      deliveryStatus: OtpDeliveryStatus.UNDELIVERED,
      otpStatus: WithdrawalOtpStatus.FAILED,
      terminal: true,
      userSafeMessage: 'Le code OTP n’a pas pu être livré. Vous pouvez demander un nouveau code.',
    };
  }

  if (group === 'PENDING' || group === 'ACCEPTED' || name.includes('PENDING')) {
    return { deliveryStatus: OtpDeliveryStatus.SENT_TO_PROVIDER, terminal: false };
  }

  return { deliveryStatus: OtpDeliveryStatus.DELIVERY_UNKNOWN, terminal: false };
}
