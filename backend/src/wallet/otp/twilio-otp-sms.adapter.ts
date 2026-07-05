import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpSmsSenderPort } from '../shared/payment.ports';
import { toE164BeninMobileMoneyPhone } from '../shared/benin-phone-number.util';

@Injectable()
export class TwilioOtpSmsAdapter implements OtpSmsSenderPort {
  private readonly logger = new Logger(TwilioOtpSmsAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(payload: { phoneNumber: string; code: string; message: string }): Promise<{ provider: string; messageId?: string | null }> {
    const provider = this.config.get<string>('OTP_SMS_PROVIDER', 'console');
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.config.get<string>('TWILIO_FROM');
    const to = toE164BeninMobileMoneyPhone(payload.phoneNumber);

    if (provider !== 'twilio' || !accountSid || !authToken || !from || !to) {
      this.logger.warn(`OTP SMS simulé. Téléphone=${payload.phoneNumber}, code=${payload.code}`);
      return { provider: 'console', messageId: null };
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
    const body = new URLSearchParams();
    body.set('To', to);
    body.set('From', from);
    body.set('Body', payload.message);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = result?.message || result?.error_message || `Twilio a refusé l'envoi OTP (${response.status})`;
      throw new Error(message);
    }

    return { provider: 'twilio', messageId: result?.sid ?? null };
  }
}
