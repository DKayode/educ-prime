import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_NOTIFICATION_PORT,
  WITHDRAWAL_OTP_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentAuditLogPort,
  PaymentNotificationPort,
  WithdrawalOtpRepositoryPort,
} from '../../shared/payment.ports';
import { OtpDeliveryStatus, PaymentNotificationType } from '../../shared/payment.enums';
import { WithdrawalOtpStatus } from '../entities/withdrawal-otp.entity';
import { InfobipDeliveryReportDto, InfobipDeliveryReportResultDto } from '../dto/infobip-delivery-report.dto';
import { mapInfobipDeliveryStatus } from '../otp-delivery-status.mapper';

@Injectable()
export class HandleInfobipDeliveryReportUseCase {
  private readonly logger = new Logger(HandleInfobipDeliveryReportUseCase.name);

  constructor(
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
    @Inject(PAYMENT_NOTIFICATION_PORT) private readonly notifications: PaymentNotificationPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(dto: InfobipDeliveryReportDto) {
    const results = Array.isArray(dto.results) ? dto.results : [];
    const handled: Array<Record<string, unknown>> = [];

    for (const report of results) {
      if (!report.messageId) continue;
      const otp = await this.otps.findByProviderMessageId(report.messageId);
      if (!otp) {
        this.logger.warn(`Delivery report Infobip ignoré : OTP introuvable pour messageId=${report.messageId}`);
        handled.push({ messageId: report.messageId, status: 'IGNORED_OTP_NOT_FOUND' });
        continue;
      }

      const mapped = mapInfobipDeliveryStatus({
        groupName: report.status?.groupName,
        name: report.status?.name,
        description: report.status?.description,
        errorName: report.error?.name,
        errorDescription: report.error?.description,
      });

      const failedAt = mapped.deliveryStatus === OtpDeliveryStatus.UNDELIVERED ? this.parseDate(report.doneAt) ?? new Date() : null;
      const deliveredAt = mapped.deliveryStatus === OtpDeliveryStatus.DELIVERED ? this.parseDate(report.doneAt) ?? new Date() : null;
      const failureReason = mapped.deliveryStatus === OtpDeliveryStatus.UNDELIVERED
        ? report.error?.description || report.status?.description || 'SMS OTP non livré par Infobip'
        : undefined;

      const updated = await this.otps.updateProviderDeliveryStatus(otp.id, {
        deliveryStatus: mapped.deliveryStatus,
        providerStatusName: report.status?.name ?? null,
        providerStatusGroupName: report.status?.groupName ?? null,
        providerStatusDescription: report.status?.description ?? null,
        deliveryErrorCode: report.error?.name ?? null,
        deliveryErrorMessage: report.error?.description ?? null,
        deliveredAt,
        failedAt,
        lastProviderCallbackAt: new Date(),
        nextDeliveryCheckAt: mapped.terminal ? null : new Date(Date.now() + 60_000),
        status: mapped.otpStatus,
        failureReason,
      });

      if (mapped.deliveryStatus === OtpDeliveryStatus.UNDELIVERED) {
        await this.notifications.notifyUser({
          userId: otp.userId,
          title: 'Code OTP non livré',
          message: 'Votre code OTP n’a pas pu être livré. Vous pouvez demander un nouveau code depuis l’application.',
          type: PaymentNotificationType.WITHDRAWAL_OTP_UNDELIVERED,
          metadata: { withdrawalRequestId: otp.withdrawalRequestId, otpId: otp.id, providerMessageId: report.messageId },
        });

        await this.notifications.notifyAdmins({
          title: 'OTP retrait non livré',
          message: 'Infobip a indiqué qu’un OTP de retrait n’a pas été livré.',
          type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
          metadata: { withdrawalRequestId: otp.withdrawalRequestId, userId: otp.userId, providerMessageId: report.messageId, reason: failureReason },
        });
      }

      await this.audit.log({
        action: 'INFOBIP_OTP_DELIVERY_REPORT_RECEIVED',
        entity: 'WithdrawalOtp',
        entityId: otp.id,
        newValue: {
          messageId: report.messageId,
          deliveryStatus: updated.deliveryStatus,
          providerStatusName: report.status?.name,
          providerStatusGroupName: report.status?.groupName,
          error: report.error,
        },
      });

      handled.push({ messageId: report.messageId, otpId: otp.id, deliveryStatus: updated.deliveryStatus });
    }

    return { received: results.length, handled };
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
