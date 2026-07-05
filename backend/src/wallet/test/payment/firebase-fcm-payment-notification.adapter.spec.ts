import { FirebaseFcmPaymentNotificationAdapter } from '../../infrastructure/firebase-fcm-payment-notification.adapter';
import { PaymentNotificationType } from '../../shared/payment.enums';
import { PaymentNotificationEntity } from '../../user-payment/entities/payment-notification.entity';

describe('FirebaseFcmPaymentNotificationAdapter', () => {
  function makeRepositoryMock() {
    return {
      create: jest.fn((payload) => ({ id: 'notification-1', ...payload })),
      save: jest.fn(async (payload) => payload),
      update: jest.fn(async () => undefined),
    };
  }

  function makeUserRepositoryMock(result: any) {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => result),
      getMany: jest.fn(async () => result),
    };

    return {
      createQueryBuilder: jest.fn(() => queryBuilder),
      queryBuilder,
    };
  }

  it('envoie une notification FCM à un utilisateur ayant un fcm_token', async () => {
    const notificationRepository = makeRepositoryMock();
    const userRepository = makeUserRepositoryMock({ id: 10, fcm_token: 'token-user-10' });
    const firebaseService = {
      sendToTokens: jest.fn(async () => ({ success: true, messageId: 'firebase-message-id', token: 'token-user-10' })),
    };
    const resolver = {
      getRepository: jest.fn((entity) => entity === PaymentNotificationEntity ? notificationRepository : userRepository),
    };

    const adapter = new FirebaseFcmPaymentNotificationAdapter(resolver as any, firebaseService as any);

    await adapter.notifyUser({
      userId: 10,
      title: 'Wallet crédité',
      message: 'Votre wallet a été crédité.',
      type: PaymentNotificationType.WALLET_CREDITED,
      metadata: { examId: 'exam-001' },
    });

    expect(firebaseService.sendToTokens).toHaveBeenCalledWith({
      tokens: ['token-user-10'],
      payload: expect.objectContaining({
        title: 'Wallet crédité',
        body: 'Votre wallet a été crédité.',
        data: expect.objectContaining({ examId: 'exam-001' }),
      }),
    });
    expect(notificationRepository.update).toHaveBeenCalledWith('notification-1', expect.objectContaining({ fcmStatus: 'SENT' }));
  });

  it("n'échoue pas le métier si l'utilisateur n'a pas encore de fcm_token", async () => {
    const notificationRepository = makeRepositoryMock();
    const userRepository = makeUserRepositoryMock({ id: 10, fcm_token: null });
    const firebaseService = { sendToTokens: jest.fn() };
    const resolver = {
      getRepository: jest.fn((entity) => entity === PaymentNotificationEntity ? notificationRepository : userRepository),
    };

    const adapter = new FirebaseFcmPaymentNotificationAdapter(resolver as any, firebaseService as any);

    await adapter.notifyUser({
      userId: 10,
      title: 'Paiement effectué',
      message: 'Votre paiement a été effectué.',
      type: PaymentNotificationType.PAYMENT_COMPLETED,
    });

    expect(firebaseService.sendToTokens).not.toHaveBeenCalled();
    expect(notificationRepository.update).toHaveBeenCalledWith('notification-1', expect.objectContaining({ fcmStatus: 'SKIPPED' }));
  });

  it('envoie une alerte FCM aux administrateurs actifs', async () => {
    const notificationRepository = makeRepositoryMock();
    const userRepository = makeUserRepositoryMock([
      { id: 1, fcm_token: 'admin-token-1' },
      { id: 2, fcm_token: 'admin-token-2' },
    ]);
    const firebaseService = {
      sendToTokens: jest.fn(async () => ({ successCount: 2, failureCount: 0, responses: [] })),
    };
    const resolver = {
      getRepository: jest.fn((entity) => entity === PaymentNotificationEntity ? notificationRepository : userRepository),
    };

    const adapter = new FirebaseFcmPaymentNotificationAdapter(resolver as any, firebaseService as any);

    await adapter.notifyAdmins({
      title: 'Nouvelle demande de retrait',
      message: 'Un utilisateur a demandé un retrait.',
      type: PaymentNotificationType.ADMIN_WITHDRAWAL_ALERT,
      metadata: { withdrawalRequestId: 'withdrawal-001' },
    });

    expect(firebaseService.sendToTokens).toHaveBeenCalledWith({
      tokens: ['admin-token-1', 'admin-token-2'],
      payload: expect.objectContaining({
        title: 'Nouvelle demande de retrait',
        body: 'Un utilisateur a demandé un retrait.',
      }),
    });
    expect(notificationRepository.update).toHaveBeenCalledWith('notification-1', expect.objectContaining({ fcmStatus: 'SENT', fcmSuccessCount: 2 }));
  });
});
