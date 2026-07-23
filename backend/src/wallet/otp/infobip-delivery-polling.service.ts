import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PAYMENT_AUDIT_LOG_PORT, PAYMENT_NOTIFICATION_PORT, WITHDRAWAL_OTP_REPOSITORY } from '../shared/payment.tokens';
import { PaymentAuditLogPort, PaymentNotificationPort, WithdrawalOtpRepositoryPort } from '../shared/payment.ports';
import { OtpDeliveryStatus, PaymentNotificationType } from '../shared/payment.enums';
import { WithdrawalOtpStatus } from './entities/withdrawal-otp.entity';
import { mapInfobipDeliveryStatus } from './otp-delivery-status.mapper';

interface InfobipReportsResponse {
  results?: Array<{
    messageId?: string;
    doneAt?: string;
    sentAt?: string;
    status?: { groupName?: string; name?: string; description?: string };
    error?: { name?: string; description?: string };
  }>;
}

@Injectable()
export class InfobipDeliveryPollingService {
  private readonly logger = new Logger(InfobipDeliveryPollingService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  @Interval('infobip-otp-delivery-polling', 60_000)
  async pollPendingDeliveryReports() {
    const enabled = this.config.get<string>('OTP_DELIVERY_POLLING_ENABLED', 'true') === 'true';
    if (!enabled || this.running) return;

    const baseUrl = this.normalizeBaseUrl(this.config.get<string>('INFOBIP_BASE_URL'));
    const apiKey = this.config.get<string>('INFOBIP_API_KEY');
    if (!baseUrl || !apiKey) return;

    this.running = true;
    try {
      const pendingOtps = await this.otps.findPendingDeliveryChecks(50);
      for (const otp of pendingOtps) {
        await this.checkOneOtp(baseUrl, apiKey, otp.id, otp.providerMessageId ?? null, otp.deliveryCheckCount ?? 0, otp.createdAt);
      }
    } finally {
      this.running = false;
    }
  }

  private async checkOneOtp(baseUrl: string, apiKey: string, otpId: string, messageId: string | null, checkCount: number, createdAt: Date) {
    const maxChecks = Number(this.config.get<string>('OTP_DELIVERY_MAX_CHECKS', '5'));
    const timeoutSeconds = Number(this.config.get<string>('OTP_DELIVERY_TIMEOUT_SECONDS', '300'));

    if (!messageId) {
      await this.otps.updateProviderDeliveryStatus(otpId, {
        deliveryStatus: OtpDeliveryStatus.DELIVERY_UNKNOWN,
        providerStatusDescription: 'Aucun messageId Infobip disponible pour vérifier la livraison',
        lastProviderCallbackAt: new Date(),
        nextDeliveryCheckAt: checkCount + 1 >= maxChecks ? null : new Date(Date.now() + 60_000),
      });
      return;
    }

    if (Date.now() - createdAt.getTime() > timeoutSeconds * 1000 || checkCount >= maxChecks) {
      const updated = await this.otps.updateProviderDeliveryStatus(otpId, {
        deliveryStatus: OtpDeliveryStatus.DELIVERY_TIMEOUT,
        status: WithdrawalOtpStatus.FAILED,
        failureReason: 'Aucune confirmation de livraison Infobip dans le délai prévu',
        providerStatusDescription: 'Delivery report absent après délai maximal',
        failedAt: new Date(),
        lastProviderCallbackAt: new Date(),
        nextDeliveryCheckAt: null,
      });
      await this.notifications.notifyUser({
        userId: updated.userId,
        title: 'Code OTP non confirmé',
        message: 'La livraison de votre code OTP n’a pas été confirmée. Vous pouvez demander un nouveau code depuis l’application.',
        type: PaymentNotificationType.WITHDRAWAL_OTP_DELIVERY_UNKNOWN,
        metadata: { withdrawalRequestId: updated.withdrawalRequestId, otpId, messageId },
      });
      await this.audit.log({
        action: 'INFOBIP_OTP_DELIVERY_TIMEOUT',
        entity: 'WithdrawalOtp',
        entityId: otpId,
        newValue: { messageId, checkCount, timeoutSeconds },
      });
      return;
    }

    const report = await this.fetchReport(baseUrl, apiKey, messageId);
    await this.otps.markDeliveryCheckAttempt(otpId, new Date(Date.now() + 60_000));
    if (!report) return;

    const mapped = mapInfobipDeliveryStatus({
      groupName: report.status?.groupName,
      name: report.status?.name,
      description: report.status?.description,
      errorName: report.error?.name,
      errorDescription: report.error?.description,
    });

    const updated = await this.otps.updateProviderDeliveryStatus(otpId, {
      deliveryStatus: mapped.deliveryStatus,
      providerStatusName: report.status?.name ?? null,
      providerStatusGroupName: report.status?.groupName ?? null,
      providerStatusDescription: report.status?.description ?? null,
      deliveryErrorCode: report.error?.name ?? null,
      deliveryErrorMessage: report.error?.description ?? null,
      deliveredAt: mapped.deliveryStatus === OtpDeliveryStatus.DELIVERED ? this.parseDate(report.doneAt) ?? new Date() : null,
      failedAt: mapped.deliveryStatus === OtpDeliveryStatus.UNDELIVERED ? this.parseDate(report.doneAt) ?? new Date() : null,
      lastProviderCallbackAt: new Date(),
      nextDeliveryCheckAt: mapped.terminal ? null : new Date(Date.now() + 60_000),
      status: mapped.otpStatus,
      failureReason: mapped.deliveryStatus === OtpDeliveryStatus.UNDELIVERED ? report.error?.description || report.status?.description || 'SMS OTP non livré par Infobip' : undefined,
    });

    if (updated.deliveryStatus === OtpDeliveryStatus.UNDELIVERED) {
      await this.notifications.notifyUser({
        userId: updated.userId,
        title: 'Code OTP non livré',
        message: 'Votre code OTP n’a pas pu être livré. Vous pouvez demander un nouveau code depuis l’application.',
        type: PaymentNotificationType.WITHDRAWAL_OTP_UNDELIVERED,
        metadata: { withdrawalRequestId: updated.withdrawalRequestId, otpId, messageId },
      });
    }
  }

  private async fetchReport(baseUrl: string, apiKey: string, messageId: string) {
    const endpoint = this.config.get<string>('INFOBIP_REPORTS_ENDPOINT', '/sms/1/reports');
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}?messageId=${encodeURIComponent(messageId)}&limit=1`;
    const timeoutMs = Number(this.config.get<string>('INFOBIP_TIMEOUT_MS', '10000'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { Authorization: `App ${apiKey}`, Accept: 'application/json' },
      });
      if (!response.ok) {
        this.logger.warn(`Lecture delivery report Infobip refusée (${response.status}) pour messageId=${messageId}`);
        return null;
      }
      const data = await response.json() as InfobipReportsResponse;
      return data.results?.[0] ?? null;
    } catch (error) {
      this.logger.warn(`Impossible de lire le delivery report Infobip pour messageId=${messageId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeBaseUrl(baseUrl?: string | null): string | null {
    if (!baseUrl) return null;
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
