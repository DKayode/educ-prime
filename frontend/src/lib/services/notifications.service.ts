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
    }
};
