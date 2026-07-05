import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from 'src/config/data-source-resolver.service';
import { FirebaseService, NotificationPayload } from 'src/firebase/firebase.service';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import { PaymentNotificationType } from '../shared/payment.enums';
import { PaymentNotificationPort } from '../shared/payment.ports';
import { PaymentNotificationEntity } from '../user-payment/entities/payment-notification.entity';

type PaymentNotificationCommand = {
  userId?: number | null;
  title: string;
  message: string;
  type: PaymentNotificationType;
  metadata?: Record<string, unknown>;
};

/**
 * Adaptateur infrastructure FCM.
 *
 * Rôle :
 * 1. persister l'évènement de notification dans payment_notifications ;
 * 2. récupérer le ou les fcm_token depuis la table utilisateurs ;
 * 3. envoyer la notification mobile via le FirebaseService existant;
 * 4. ne jamais bloquer une opération métier critique si Firebase échoue.
 */
@Injectable()
export class FirebaseFcmPaymentNotificationAdapter implements PaymentNotificationPort {
  private readonly logger = new Logger(FirebaseFcmPaymentNotificationAdapter.name);

  constructor(
    private readonly resolver: DataSourceResolver,
    private readonly firebaseService: FirebaseService,
  ) { }

  private get notificationRepository(): Repository<PaymentNotificationEntity> {
    return this.resolver.getRepository(PaymentNotificationEntity);
  }

  private get userRepository(): Repository<Utilisateur> {
    return this.resolver.getRepository(Utilisateur);
  }

  async notifyUser(payload: PaymentNotificationCommand): Promise<void> {
    const notification = await this.saveNotification({
      ...payload,
      userId: payload.userId ?? null,
      forAdmins: false,
    });

    if (!payload.userId) {
      await this.markSkipped(notification.id, 'Notification utilisateur sans userId');
      return;
    }

    const token = await this.findUserFcmToken(payload.userId);
    if (!token) {
      await this.markSkipped(notification.id, `Aucun fcm_token actif pour l'utilisateur ${payload.userId}`);
      return;
    }

    await this.sendToTokens(notification, [token]);
  }

  async notifyAdmins(payload: Omit<PaymentNotificationCommand, 'userId'>): Promise<void> {
    const notification = await this.saveNotification({
      ...payload,
      userId: null,
      forAdmins: true,
    });

    const tokens = await this.findAdminFcmTokens();
    if (tokens.length === 0) {
      await this.markSkipped(notification.id, 'Aucun fcm_token administrateur actif');
      return;
    }

    await this.sendToTokens(notification, tokens);
  }

  private async saveNotification(payload: PaymentNotificationCommand & { forAdmins: boolean }): Promise<PaymentNotificationEntity> {
    return this.notificationRepository.save(
      this.notificationRepository.create({
        userId: payload.userId ?? null,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        metadata: payload.metadata ?? null,
        forAdmins: payload.forAdmins,
        isRead: false,
        fcmStatus: 'PENDING',
      }),
    );
  }

  private async findUserFcmToken(userId: number): Promise<string | null> {
    const user = await this.userRepository
      .createQueryBuilder('utilisateur')
      .select(['utilisateur.id', 'utilisateur.fcm_token'])
      .where('utilisateur.id = :userId', { userId })
      .andWhere('utilisateur.est_desactive = false')
      .getOne();

    return this.normalizeToken(user?.fcm_token);
  }

  private async findAdminFcmTokens(): Promise<string[]> {
    const admins = await this.userRepository
      .createQueryBuilder('utilisateur')
      .select(['utilisateur.id', 'utilisateur.fcm_token'])
      .where('utilisateur.role = :role', { role: 'admin' })
      .andWhere('utilisateur.est_desactive = false')
      .andWhere('utilisateur.fcm_token IS NOT NULL')
      .andWhere("NULLIF(TRIM(utilisateur.fcm_token), '') IS NOT NULL")
      .getMany();

    return Array.from(
      new Set(
        admins
          .map((admin) => this.normalizeToken(admin.fcm_token))
          .filter((token): token is string => !!token),
      ),
    );
  }

  private normalizeToken(token?: string | null): string | null {
    const normalized = token?.trim();
    return normalized && normalized.length > 0 ? normalized : null;
  }

  private async sendToTokens(notification: PaymentNotificationEntity, tokens: string[]): Promise<void> {
    try {
      const result = await this.firebaseService.sendToTokens({
        tokens,
        payload: this.toFirebasePayload(notification),
      });

      const successCount = this.getSuccessCount(result, tokens.length);
      const failureCount = this.getFailureCount(result);

      await this.notificationRepository.update(notification.id, {
        fcmStatus: failureCount > 0 && successCount > 0 ? 'PARTIAL_FAILED' : 'SENT',
        fcmSuccessCount: successCount,
        fcmFailureCount: failureCount,
        fcmMessageId: typeof result?.messageId === 'string' ? result.messageId : null,
        fcmFailureReason: failureCount > 0 ? this.stringifyFailure(result) : null,
        fcmSentAt: new Date(),
      });
    } catch (error: any) {
      this.logger.warn(`Notification FCM non envoyée (${notification.id}) : ${error?.message ?? error}`);
      await this.notificationRepository.update(notification.id, {
        fcmStatus: 'FAILED',
        fcmFailureCount: tokens.length,
        fcmFailureReason: error?.message ?? String(error),
      });
    }
  }

  private toFirebasePayload(notification: PaymentNotificationEntity): NotificationPayload {
    const metadata = notification.metadata ?? {};
    const proofUrl = typeof metadata.proofUrl === 'string' ? metadata.proofUrl : undefined;

    return {
      title: notification.title,
      body: notification.message,
      sound: 'default',
      imageUrl: proofUrl,
      data: this.stringifyData({
        notificationId: notification.id,
        notificationType: notification.type,
        forAdmins: notification.forAdmins,
        userId: notification.userId,
        ...metadata,
      }),
    };
  }

  private stringifyData(data: Record<string, unknown>): Record<string, string> {
    return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === null || value === undefined) acc[key] = '';
      else if (typeof value === 'string') acc[key] = value;
      else acc[key] = JSON.stringify(value);
      return acc;
    }, {});
  }

  private getSuccessCount(result: any, fallback: number): number {
    if (typeof result?.successCount === 'number') return result.successCount;
    if (result?.success === true) return 1;
    return fallback;
  }

  private getFailureCount(result: any): number {
    if (typeof result?.failureCount === 'number') return result.failureCount;
    if (result?.success === false) return 1;
    return 0;
  }

  private stringifyFailure(result: any): string | null {
    if (!result) return null;
    const failedResponses = Array.isArray(result.responses)
      ? result.responses.filter((response) => !response.success)
      : [];

    if (failedResponses.length === 0) return null;
    return JSON.stringify(
      failedResponses.map((response) => ({
        token: response.token,
        code: response.error?.code,
        message: response.error?.message,
      })),
    );
  }

  private async markSkipped(notificationId: string, reason: string): Promise<void> {
    await this.notificationRepository.update(notificationId, {
      fcmStatus: 'SKIPPED',
      fcmFailureReason: reason,
    });
  }
}
