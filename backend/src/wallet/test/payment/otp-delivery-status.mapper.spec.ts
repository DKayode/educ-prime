import { OtpDeliveryStatus } from '../../shared/payment.enums';
import { WithdrawalOtpStatus } from '../../otp/entities/withdrawal-otp.entity';
import { mapInfobipDeliveryStatus } from '../../otp/otp-delivery-status.mapper';

describe('mapInfobipDeliveryStatus', () => {
  it('mappe DELIVERED vers DELIVERED', () => {
    const result = mapInfobipDeliveryStatus({ groupName: 'DELIVERED', name: 'DELIVERED_TO_HANDSET' });
    expect(result.deliveryStatus).toBe(OtpDeliveryStatus.DELIVERED);
    expect(result.terminal).toBe(true);
  });

  it('mappe UNDELIVERABLE vers OTP FAILED', () => {
    const result = mapInfobipDeliveryStatus({ groupName: 'UNDELIVERABLE', name: 'UNDELIVERABLE_NOT_DELIVERED' });
    expect(result.deliveryStatus).toBe(OtpDeliveryStatus.UNDELIVERED);
    expect(result.otpStatus).toBe(WithdrawalOtpStatus.FAILED);
    expect(result.terminal).toBe(true);
  });

  it('garde PENDING comme statut non terminal', () => {
    const result = mapInfobipDeliveryStatus({ groupName: 'PENDING', name: 'PENDING_ENROUTE' });
    expect(result.deliveryStatus).toBe(OtpDeliveryStatus.SENT_TO_PROVIDER);
    expect(result.terminal).toBe(false);
  });
});
