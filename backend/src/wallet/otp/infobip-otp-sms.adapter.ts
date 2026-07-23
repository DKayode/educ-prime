import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpDeliveryStatus } from '../shared/payment.enums';
import { OtpSmsSenderPort } from '../shared/payment.ports';
import { toE164BeninMobileMoneyPhone } from '../shared/benin-phone-number.util';

interface InfobipSendSmsResponse {
  bulkId?: string;
  messages?: Array<{
    messageId?: string;
    to?: string;
    status?: {
      groupId?: number;
      groupName?: string;
      id?: number;
      name?: string;
      description?: string;
    };
  }>;
  requestError?: {
    serviceException?: {
      messageId?: string;
      text?: string;
    };
  };
  message?: string;
  error?: string;
}

@Injectable()
export class InfobipOtpSmsAdapter implements OtpSmsSenderPort {
  private readonly logger = new Logger(InfobipOtpSmsAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(payload: {
    phoneNumber: string;
    code: string;
    message: string;
    provider?: string;
    withdrawalRequestId?: string;
    userId?: number;
  }): Promise<{ provider: string; messageId?: string | null; bulkId?: string | null; deliveryStatus?: OtpDeliveryStatus }> {
    const provider = (payload.provider || this.config.get<string>('OTP_SMS_PROVIDER', 'console')).toLowerCase();
    const toE164 = toE164BeninMobileMoneyPhone(payload.phoneNumber);

    const finalMessage = this.appendAndroidSmsHash(payload.message);

    if (provider !== 'infobip') {
      this.logger.warn(`OTP SMS simulé. provider=${provider}, téléphone=${payload.phoneNumber}, code=${payload.code}, message=${finalMessage}`);
      return { provider: 'console', messageId: null, bulkId: null, deliveryStatus: OtpDeliveryStatus.NOT_REQUIRED };
    }

    const baseUrl = this.normalizeBaseUrl(this.config.get<string>('INFOBIP_BASE_URL'));
    const apiKey = this.config.get<string>('INFOBIP_API_KEY');
    const from = this.config.get<string>('INFOBIP_FROM', 'EDUKIA');
    const endpointPath = this.config.get<string>('INFOBIP_SMS_ENDPOINT', '/sms/2/text/advanced');
    const timeoutMs = Number(this.config.get<string>('INFOBIP_TIMEOUT_MS', '10000'));
    const removePlusFromDestination = this.config.get<string>('INFOBIP_REMOVE_PLUS_FROM_TO', 'true') === 'true';
    const notifyUrl = this.config.get<string>('INFOBIP_DELIVERY_REPORT_NOTIFY_URL');
    const notifyContentType = this.config.get<string>('INFOBIP_NOTIFY_CONTENT_TYPE', 'application/json');

    if (!toE164) throw new Error('Numéro Mobile Money invalide pour envoi OTP Infobip');
    if (!baseUrl || !apiKey || !from) {
      throw new Error('Configuration Infobip incomplète : INFOBIP_BASE_URL, INFOBIP_API_KEY et INFOBIP_FROM sont obligatoires');
    }

    const to = removePlusFromDestination ? toE164.replace(/^\+/, '') : toE164;
    const url = `${baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const messagePayload: Record<string, unknown> = {
      from,
      destinations: [{ to }],
      text: finalMessage,
    };

    // Infobip SMS API v2 peut recevoir notifyUrl / notifyContentType pour pousser les delivery reports.
    if (notifyUrl) {
      messagePayload.notifyUrl = notifyUrl;
      messagePayload.notifyContentType = notifyContentType;
      messagePayload.callbackData = JSON.stringify({
        kind: 'WITHDRAWAL_OTP',
        withdrawalRequestId: payload.withdrawalRequestId,
        userId: payload.userId,
      });
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `App ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ messages: [messagePayload] }),
      });

      const result = await this.readJsonSafely(response);
      if (!response.ok) throw new Error(this.extractInfobipError(result, response.status));

      const firstMessage = result.messages?.[0];
      const statusName = firstMessage?.status?.name;
      const statusDescription = firstMessage?.status?.description;
      const messageId = firstMessage?.messageId ?? null;

      this.logger.log(`OTP SMS accepté par Infobip. to=${to}, messageId=${messageId ?? 'n/a'}, status=${statusName ?? 'n/a'}`);

      if (statusName && !['MESSAGE_ACCEPTED', 'PENDING_ENROUTE', 'PENDING_ACCEPTED'].includes(statusName)) {
        this.logger.warn(`Infobip a retourné un statut initial non standard : ${statusName} - ${statusDescription ?? ''}`);
      }

      return {
        provider: 'infobip',
        messageId,
        bulkId: result.bulkId ?? null,
        deliveryStatus: OtpDeliveryStatus.SENT_TO_PROVIDER,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout Infobip après ${timeoutMs} ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private appendAndroidSmsHash(message: string): string {
    const androidHash = this.config.get<string>('OTP_ANDROID_SMS_HASH')?.trim();
    if (!androidHash) return message;

    const normalizedMessage = message.replace(/\s+$/g, '');
    if (normalizedMessage.endsWith(androidHash)) return normalizedMessage;

    return `${normalizedMessage}\n${androidHash}`;
  }

  private normalizeBaseUrl(baseUrl?: string | null): string | null {
    if (!baseUrl) return null;
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
  }

  private async readJsonSafely(response: Response): Promise<InfobipSendSmsResponse> {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text) as InfobipSendSmsResponse; }
    catch { return { message: text }; }
  }

  private extractInfobipError(result: InfobipSendSmsResponse, statusCode: number): string {
    const serviceException = result.requestError?.serviceException;
    if (serviceException?.text) return `Infobip a refusé l'envoi OTP (${statusCode}) : ${serviceException.text}`;
    if (result.message) return `Infobip a refusé l'envoi OTP (${statusCode}) : ${result.message}`;
    if (result.error) return `Infobip a refusé l'envoi OTP (${statusCode}) : ${result.error}`;
    return `Infobip a refusé l'envoi OTP (${statusCode})`;
  }
}
