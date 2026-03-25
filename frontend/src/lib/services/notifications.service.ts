import { api } from '../api';
import { SendNotificationDto, SubscribeTopicDto } from '../../types/notification';

export const notificationsService = {
    /**
     * Envoyer une notification (Admin)
     */
    send: async (data: SendNotificationDto) => {
        return api.post('/notifications', data);
    },

    /**
     * S'abonner à un topic
     */
    subscribeToTopic: async (data: SubscribeTopicDto) => {
        return api.post('/notifications/subscribe', data);
    },

    /**
     * Se désabonner d'un topic
     */
    unsubscribeFromTopic: async (data: SubscribeTopicDto) => {
        return api.post('/notifications/unsubscribe', data);
    },

    /**
     * Valider un token FCM
     */
    validateToken: async (token: string) => {
        return api.post('/notifications/validate-token', { token });
    },

    /**
     * Envoyer une notification par email (Admin)
     */
    sendEmail: async (data: { title: string; body: string }) => {
        return api.post('/notification-email', data);
    },

    /**
     * Désabonner un utilisateur des notifications par email
     */
    unsubscribeFromEmail: async (data: { uuid: string }) => {
        return api.post('/notification-email/unsubscribe', data);
    },

    /**
     * Vérifier le statut d'un envoi groupé par email
     */
    getEmailJobStatus: async (jobId: string) => {
        return api.get(`/notification-email/status/${jobId}`);
    },

    /**
     * Annuler un envoi groupé
     */
    cancelEmailJob: async (jobId: string) => {
        return api.post(`/notification-email/cancel/${jobId}`);
    },

    /**
     * Vider la file d'attente
     */
    drainEmailQueue: async () => {
        return api.post('/notification-email/drain');
    }
};
