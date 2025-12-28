// src/firebase/firebase.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sound?: string;
  badge?: number;
}

export interface SendNotificationOptions {
  tokens: string | string[];
  payload: NotificationPayload;
  topic?: string;
  condition?: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      const firebaseConfig = {
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: this.configService
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
      };

      if (admin.apps.length === 0) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig),
        });
        this.logger.log('Firebase Admin SDK initialisé avec succès');
      } else {
        this.firebaseApp = admin.apps[0] as admin.app.App;
      }
    } catch (error) {
      this.logger.error('Erreur lors de l\'initialisation de Firebase:', error);
      throw error;
    }
  }

  /**
   * Envoyer une notification à un ou plusieurs tokens
   */
  async sendToTokens(options: SendNotificationOptions): Promise<any> {
    try {
      const { tokens, payload } = options;

      // Construction du message selon le type de cible
      let message: admin.messaging.Message;

      const baseNotification: admin.messaging.Notification = {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      };

      const baseMessage: Partial<admin.messaging.Message> = {
        notification: baseNotification,
        data: payload.data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: payload.sound || 'default',
            channelId: 'default',
            icon: 'ic_notification',
            color: '#FF5722',
            ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: payload.sound || 'default',
              badge: payload.badge || 1,
              ...(payload.imageUrl && { 'mutable-content': 1 }),
            },
          },
          fcmOptions: {
            imageUrl: payload.imageUrl,
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icon.png',
            badge: '/badge.png',
            ...(payload.imageUrl && { image: payload.imageUrl }),
          },
        },
      };

      if (Array.isArray(tokens) && tokens.length > 1) {
        // Message multicast
        const message: any = {
          ...baseMessage,
          tokens: tokens,
        } as admin.messaging.MulticastMessage;

        const response = await admin.messaging().sendEachForMulticast(
          message as admin.messaging.MulticastMessage
        );

        const results = {
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses.map((resp, index) => ({
            token: tokens[index],
            success: resp.success,
            error: resp.error?.message || resp.error?.code || null,
          })),
        };

        this.logger.log(`Notifications envoyées: ${results.successCount} succès, ${results.failureCount} échecs`);
        return results;
      } else {
        // Message single token
        const token = Array.isArray(tokens) ? tokens[0] : tokens;
        message = {
          ...baseMessage,
          token: token,
        } as admin.messaging.TokenMessage;

        const response = await admin.messaging().send(message);

        this.logger.log(`Notification envoyée avec succès à ${token.substring(0, 10)}...`);
        return {
          success: true,
          messageId: response,
          token: token
        };
      }
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de la notification:', error);
      throw error;
    }
  }

  /**
   * Envoyer une notification à un topic
   */
  async sendToTopic(topic: string, payload: NotificationPayload): Promise<string> {
    try {
      const message: admin.messaging.TopicMessage = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: payload.badge || 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification envoyée au topic "${topic}"`);
      return response;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi au topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer une notification conditionnelle
   */
  async sendWithCondition(condition: string, payload: NotificationPayload): Promise<string> {
    try {
      const message: admin.messaging.ConditionMessage = {
        condition,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              badge: payload.badge || 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification envoyée avec condition: ${condition}`);
      return response;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi avec condition ${condition}:`, error);
      throw error;
    }
  }

  /**
   * S'abonner un token à un topic
   */
  async subscribeToTopic(tokens: string | string[], topic: string): Promise<any> {
    try {
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await admin.messaging().subscribeToTopic(tokenArray, topic);

      this.logger.log(`${response.successCount} tokens abonnés au topic "${topic}"`);
      return response;
    } catch (error) {
      this.logger.error(`Erreur lors de l'abonnement au topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Se désabonner d'un topic
   */
  async unsubscribeFromTopic(tokens: string | string[], topic: string): Promise<any> {
    try {
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await admin.messaging().unsubscribeFromTopic(tokenArray, topic);

      this.logger.log(`${response.successCount} tokens désabonnés du topic "${topic}"`);
      return response;
    } catch (error) {
      this.logger.error(`Erreur lors du désabonnement du topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Valider un token FCM
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const testMessage: admin.messaging.TokenMessage = {
        token,
        notification: {
          title: 'Validation',
          body: 'Test',
        },
        android: {
          priority: 'normal' as const,
        },
      };

      await admin.messaging().send(testMessage, true); // Dry-run mode
      return true;
    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Méthode utilitaire pour créer différents types de messages
   */
  createMessage(
    type: 'token' | 'topic' | 'condition',
    target: string,
    payload: NotificationPayload
  ): admin.messaging.Message {
    const baseNotification: admin.messaging.Notification = {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
    };

    const baseMessage = {
      notification: baseNotification,
      data: payload.data || {},
      android: {
        priority: 'high' as const,
      },
      apns: {
        payload: {
          aps: {
            sound: payload.sound || 'default',
            badge: payload.badge || 1,
          },
        },
      },
    };

    switch (type) {
      case 'token':
        return {
          ...baseMessage,
          token: target,
        } as admin.messaging.TokenMessage;

      case 'topic':
        return {
          ...baseMessage,
          topic: target,
        } as admin.messaging.TopicMessage;

      case 'condition':
        return {
          ...baseMessage,
          condition: target,
        } as admin.messaging.ConditionMessage;

      default:
        throw new Error(`Type de message non supporté: ${type}`);
    }
  }
}