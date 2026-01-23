import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import * as firebaseConf from "../config/firebase-serviceaccount.json"

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
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit() {
    await this.initializeFirebase();
  }

  /**
   * Initialise Firebase Admin SDK
   */
  private async initializeFirebase(): Promise<void> {
    try {
      // Vérifier si Firebase est déjà initialisé
      if (admin.apps.length > 0) {
        this.logger.log('Firebase déjà initialisé');
        this.isInitialized = true;
        return;
      }

      // Récupérer la configuration depuis les variables d'environnement
      const firebaseConfig = {
        projectId: firebaseConf.project_id,
        clientEmail: firebaseConf.client_email,
        privateKey: firebaseConf.private_key,
      };

      // Vérifier que toutes les variables sont présentes
      if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
        throw new Error(
          'Configuration Firebase manquante. Vérifiez FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY dans vos variables d\'environnement.'
        );
      }

      // Initialiser Firebase
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: firebaseConfig.clientEmail,
          privateKey: firebaseConfig.privateKey.replace(/\n/g, '\\n'),
        }),
      });

      this.isInitialized = true;
      this.logger.log('✅ Firebase Admin SDK initialisé avec succès');
      this.logger.debug(`Projet: ${firebaseConfig.projectId}`);

    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation de Firebase:', error);
      throw error;
    }
  }

  /**
   * Vérifier que Firebase est initialisé
   */
  private checkInitialization(): void {
    if (!this.isInitialized || admin.apps.length === 0) {
      throw new Error('Firebase Admin SDK non initialisé. Assurez-vous que la configuration Firebase est correcte.');
    }
  }

  /**
   * Envoyer une notification à un ou plusieurs tokens
   */
  async sendToTokens(options: SendNotificationOptions): Promise<any> {
    try {
      // Vérifier l'initialisation
      this.checkInitialization();

      const { tokens, payload } = options;

      this.logger.log(`Envoi notification: "${payload.title}"`);
      this.logger.debug(`Tokens: ${Array.isArray(tokens) ? tokens.length : 1}`);

      // Construction de la configuration de base
      const baseConfig = this.createBaseMessageConfig(payload);

      if (Array.isArray(tokens) && tokens.length > 1) {
        // Message multicast
        const multicastMessage: admin.messaging.MulticastMessage = {
          ...baseConfig,
          tokens: tokens,
        };

        this.logger.debug(`Multicast pour ${tokens.length} tokens`);

        const response = await admin.messaging().sendEachForMulticast(multicastMessage);

        // Analyser les résultats
        const results = {
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses.map((resp, index) => ({
            token: tokens[index],
            success: resp.success,
            messageId: resp.messageId,
            error: resp.error ? {
              code: resp.error.code,
              message: resp.error.message,
            } : null,
          })),
        };

        this.logger.log(`Résultat: ${results.successCount} succès, ${results.failureCount} échecs`);

        // Log détaillé des échecs
        if (results.failureCount > 0) {
          results.responses
            .filter(r => !r.success)
            .forEach((failed, index) => {
              this.logger.warn(`Échec ${index + 1}: ${failed.error?.code} - ${failed.error?.message}`);
            });
        }

        return results;

      } else {
        // Message single token
        const token = Array.isArray(tokens) ? tokens[0] : tokens;

        const tokenMessage: admin.messaging.TokenMessage = {
          ...baseConfig,
          token: token,
        };

        this.logger.debug(`Single token: ${token.substring(0, 20)}...`);

        const response = await admin.messaging().send(tokenMessage);

        this.logger.log(`✅ Notification envoyée avec succès (Message ID: ${response})`);

        return {
          success: true,
          messageId: response,
          token: token,
        };
      }

    } catch (error: any) {
      this.logger.error('❌ Erreur lors de l\'envoi de la notification:', error);

      // Ajouter plus de détails sur l'erreur
      if (error.code) {
        this.logger.error(`Code d'erreur: ${error.code}`);
        this.logger.error(`Message: ${error.message}`);

        switch (error.code) {
          case 'messaging/invalid-registration-token':
            throw new BadRequestException('Token FCM invalide. Le token peut être expiré ou mal formaté.');
          case 'messaging/registration-token-not-registered':
            throw new BadRequestException('Token non enregistré. L\'application a peut-être été désinstallée.');
          case 'app/no-app':
            throw new BadRequestException('Firebase non initialisé. Vérifiez votre configuration.');
          default:
            throw error;
        }
      }

      throw error;
    }
  }

  /**
   * Créer la configuration de base du message
   */
  // private createBaseMessageConfig(payload: NotificationPayload): any {
  //   return {
  //     notification: {
  //       title: payload.title,
  //       body: payload.body,
  //       imageUrl: payload.imageUrl,
  //     },
  //     data: payload.data || {},
  //     android: {
  //       priority: 'high' as const,
  //       notification: {
  //         title: payload.title,
  //         body: payload.body,
  //         sound: payload.sound || 'default',
  //         channelId: 'default',
  //         icon: 'ic_notification',
  //         color: '#FF5722',
  //         clickAction: 'FLUTTER_NOTIFICATION_CLICK',
  //         ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
  //       },
  //     },
  //     apns: {
  //       payload: {
  //         aps: {
  //           alert: {
  //             title: payload.title,
  //             body: payload.body,
  //           },
  //           sound: payload.sound || 'default',
  //           badge: payload.badge || 1,
  //           'content-available': 1,
  //           ...(payload.imageUrl && { 'mutable-content': 1 }),
  //         },
  //       },
  //       headers: {
  //         'apns-priority': '10',
  //       },
  //       fcmOptions: {
  //         imageUrl: payload.imageUrl,
  //       },
  //     },
  //     webpush: {
  //       notification: {
  //         title: payload.title,
  //         body: payload.body,
  //         icon: '/icon.png',
  //         badge: '/badge.png',
  //         ...(payload.imageUrl && { image: payload.imageUrl }),
  //       },
  //       fcmOptions: {
  //         link: payload.data?.url || '/',
  //       },
  //     },
  //   };
  // }

  private stringifyData(data: any = {}): Record<string, string> {
    const result: Record<string, string> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        result[key] = '';
      } else if (typeof value === 'string') {
        result[key] = value;
      } else {
        result[key] = JSON.stringify(value);
      }
    });

    return result;
  }

  private createBaseMessageConfig(payload: NotificationPayload): any {
    return {
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
      },

      // data: this.stringifyData(payload.data),

      android: {
        priority: 'high',
        notification: {
          channelId: 'default', // ⚠️ doit exister côté app
          sound: payload.sound || 'default',
          icon: 'ic_notification',
          color: '#FF5722',
          ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
      },

      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: payload.sound || 'default',
            badge: payload.badge || 1,
            ...(payload.imageUrl ? { 'mutable-content': 1 } : {}),
          },
        },
        ...(payload.imageUrl
          ? { fcmOptions: { imageUrl: payload.imageUrl } }
          : {}),
      },

      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icon.png',
          badge: '/badge.png',
          ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
        },
        fcmOptions: {
          link: payload.data?.url || '/',
        },
      },
    };
  }


  /**
   * Envoyer une notification à un topic
   */
  async sendToTopic(topic: string, payload: NotificationPayload): Promise<string> {
    try {
      this.checkInitialization();

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

      this.logger.log(`Envoi au topic: "${topic}"`);

      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Notification envoyée au topic "${topic}" (Message ID: ${response})`);
      return response;

    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi au topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer une notification conditionnelle
   */
  async sendWithCondition(condition: string, payload: NotificationPayload): Promise<string> {
    try {
      this.checkInitialization();

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

      this.logger.log(`Envoi avec condition: "${condition}"`);

      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Notification envoyée avec condition "${condition}" (Message ID: ${response})`);
      return response;

    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi avec condition ${condition}:`, error);
      throw error;
    }
  }

  /**
   * S'abonner un token à un topic
   */
  async subscribeToTopic(tokens: string | string[], topic: string): Promise<any> {
    try {
      this.checkInitialization();

      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      this.logger.log(`Abonnement de ${tokenArray.length} token(s) au topic "${topic}"`);

      const response = await admin.messaging().subscribeToTopic(tokenArray, topic);

      this.logger.log(`✅ ${response.successCount} tokens abonnés au topic "${topic}"`);

      if (response.failureCount > 0) {
        this.logger.warn(`${response.failureCount} échecs d'abonnement`);
      }

      return response;

    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'abonnement au topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Se désabonner d'un topic
   */
  async unsubscribeFromTopic(tokens: string | string[], topic: string): Promise<any> {
    try {
      this.checkInitialization();

      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      this.logger.log(`Désabonnement de ${tokenArray.length} token(s) du topic "${topic}"`);

      const response = await admin.messaging().unsubscribeFromTopic(tokenArray, topic);

      this.logger.log(`✅ ${response.successCount} tokens désabonnés du topic "${topic}"`);

      if (response.failureCount > 0) {
        this.logger.warn(`${response.failureCount} échecs de désabonnement`);
      }

      return response;

    } catch (error) {
      this.logger.error(`❌ Erreur lors du désabonnement du topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Valider un token FCM
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      this.checkInitialization();

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

      // Utiliser le mode dry-run pour valider sans envoyer
      await admin.messaging().send(testMessage, true);

      this.logger.debug(`✅ Token valide: ${token.substring(0, 20)}...`);
      return true;

    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`❌ Token invalide: ${error.message}`);
        return false;
      }

      this.logger.error(`Erreur lors de la validation du token:`, error);
      throw error;
    }
  }

  /**
   * Test de connexion Firebase
   */
  // async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  //   try {
  //     this.checkInitialization();

  //     // Tester en récupérant le project ID
  //     const projectId = admin.apps[0]?.options?.credential?.getProjectId();

  //     return {
  //       success: true,
  //       message: '✅ Firebase correctement configuré',
  //       details: {
  //         projectId,
  //         isInitialized: this.isInitialized,
  //         appCount: admin.apps.length,
  //       }
  //     };

  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: `❌ Erreur Firebase: ${error.message}`,
  //       details: {
  //         isInitialized: this.isInitialized,
  //         appCount: admin.apps.length,
  //         error: error.message,
  //       }
  //     };
  //   }
  // }

  /**
   * Test d'envoi de notification (mode dry-run)
   */
  async testNotification(token: string): Promise<{ success: boolean; message: string }> {
    try {
      this.checkInitialization();

      const testMessage: admin.messaging.TokenMessage = {
        token,
        notification: {
          title: 'Test Firebase',
          body: 'Ceci est un test de notification',
        },
        data: {
          test: 'true',
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high' as const,
        },
      };

      // Utiliser dry-run pour tester sans vraiment envoyer
      const response = await admin.messaging().send(testMessage, true);

      return {
        success: true,
        message: `✅ Test réussi (dry-run). Token valide.`
      };

    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token') {
        return {
          success: false,
          message: `❌ Token invalide: ${error.message}`
        };
      }

      return {
        success: false,
        message: `❌ Erreur de test: ${error.message}`
      };
    }
  }
}