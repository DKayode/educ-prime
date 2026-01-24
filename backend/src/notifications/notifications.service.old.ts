import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService, NotificationPayload } from '../firebase/firebase.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);


    constructor(private readonly firebaseService: FirebaseService,
        @InjectRepository(Utilisateur)
        private utilisateurRepository: Repository<Utilisateur>,
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,) { }

    // async sendNotification(dto: SendNotificationDto) {
    //   const payload: NotificationPayload = {
    //     title: dto.title,
    //     body: dto.body
    //   };

    //   if (dto.topic) {
    //     return await this.firebaseService.sendToTopic(dto.topic, payload);

    //   } else if (dto.condition) {
    //     return await this.firebaseService.sendWithCondition(dto.condition, payload);

    //   } else if (dto.tokens) {
    //     // Si des tokens sont fournis, on les utilise directement
    //     return await this.firebaseService.sendToTokens({
    //       tokens: dto.tokens,
    //       payload,
    //     });

    //   } else {
    //     // Si aucun destinataire n'est spécifié, on récupère TOUS les tokens de la base
    //     const allTokens = await this.getAllFcmTokens();
    //     this.logger.log(`${allTokens} `);


    //     if (allTokens.length === 0) {
    //       throw new Error('Aucun token FCM trouvé dans la base de données');
    //     }

    //     this.logger.log(`Envoi à ${allTokens.length} tokens récupérés depuis la base`);

    //     await this.firebaseService.sendToTokens({
    //       tokens: allTokens,
    //       payload,
    //     });

    //   }

    //   const NotificationCreated = await this.createAndStoreNotification(dto);

    //   this.logger.log(`Notification ${NotificationCreated} créer avec succès`);

    //   return NotificationCreated
    // }

    async sendNotification(dto: SendNotificationDto) {
        // 1. Créer et stocker la notification en base de données d'abord
        const notificationCreated = await this.createAndStoreNotification(dto);
        this.logger.log(`Notification ${notificationCreated.id} créée avec succès`);

        // 2. Préparer le payload pour Firebase
        const payload: NotificationPayload = {
            title: dto.title,
            body: dto.body,
            // Inclure l'ID de notification dans les données pour référence
            data: {
                ...dto.data,
            },
        };

        // 3. Gérer l'envoi selon le type de destinataire
        if (dto.topic) {
            // Envoyer au topic (en arrière-plan)
            this.sendFirebaseNotificationAsync({
                type: 'topic',
                target: dto.topic,
                payload,
                notificationId: notificationCreated.id,
            }).catch(error => {
                this.logger.error(`Erreur lors de l'envoi au topic: ${error.message}`);
            });

        } else if (dto.condition) {
            // Envoyer avec condition (en arrière-plan)
            this.sendFirebaseNotificationAsync({
                type: 'condition',
                target: dto.condition,
                payload,
                notificationId: notificationCreated.id,
            }).catch(error => {
                this.logger.error(`Erreur lors de l'envoi avec condition: ${error.message}`);
            });

        } else if (dto.tokens && dto.tokens.length > 0) {
            // Envoyer aux tokens spécifiques (en arrière-plan)
            this.sendFirebaseNotificationAsync({
                type: 'tokens',
                target: dto.tokens,
                payload,
                notificationId: notificationCreated.id,
            }).catch(error => {
                this.logger.error(`Erreur lors de l'envoi aux tokens: ${error.message}`);
            });

        } else {
            // Si aucun destinataire n'est spécifié, on récupère TOUS les tokens de la base
            const allTokens = await this.getAllFcmTokens();
            this.logger.log(`${allTokens.length} tokens trouvés`);

            if (allTokens.length === 0) {
                // Retourner une erreur JSON sans planter l'application
                throw new BadRequestException('Aucun token FCM trouvé dans la base de données');
            }

            this.logger.log(`Envoi à ${allTokens.length} tokens récupérés depuis la base`);

            // Envoyer à tous les tokens (en arrière-plan)
            this.sendFirebaseNotificationAsync({
                type: 'all',
                target: allTokens,
                payload,
                notificationId: notificationCreated.id,
            }).catch(error => {
                this.logger.error(`Erreur lors de l'envoi à tous les tokens: ${error.message}`);
            });
        }

        // 4. Retourner la réponse immédiatement (sans attendre l'envoi Firebase)
        return {
            success: true,
            message: 'Notification créée avec succès, envoi en cours...',
            notification: notificationCreated,
            notificationId: notificationCreated.id,
        };
    }

    // Méthode privée pour l'envoi asynchrone des notifications Firebase
    private async sendFirebaseNotificationAsync(params: {
        type: 'topic' | 'condition' | 'tokens' | 'all';
        target: string | string[];
        payload: NotificationPayload;
        notificationId: number;
    }): Promise<void> {
        try {
            const { type, target, payload, notificationId } = params;

            switch (type) {
                case 'topic':
                    await this.firebaseService.sendToTopic(target as string, payload);
                    this.logger.log(`Notification ${notificationId} envoyée au topic: ${target}`);
                    break;

                case 'condition':
                    await this.firebaseService.sendWithCondition(target as string, payload);
                    this.logger.log(`Notification ${notificationId} envoyée avec condition: ${target}`);
                    break;

                case 'tokens':
                    await this.firebaseService.sendToTokens({
                        tokens: target as string[],
                        payload,
                    });
                    this.logger.log(`Notification ${notificationId} envoyée à ${(target as string[]).length} tokens spécifiques`);
                    break;

                case 'all':
                    await this.firebaseService.sendToTokens({
                        tokens: target as string[],
                        payload,
                    });
                    this.logger.log(`Notification ${notificationId} envoyée à ${(target as string[]).length} tokens (tous les utilisateurs)`);
                    break;
            }

            // Marquer comme envoyée dans la base de données (optionnel)
            await this.notificationRepository.update(notificationId, {
                ...payload.data
            });

        } catch (error) {
            this.logger.error(`Erreur Firebase pour notification ${params.notificationId}: ${error.message}`);

            // Enregistrer l'erreur dans la base de données (optionnel)
            await this.notificationRepository.update(params.notificationId, {
                data: {
                    ...params.payload.data,
                    firebaseError: error.message,
                    // firebaseSent: false,
                },
            });

            throw error; // Propager l'erreur pour le catch dans la méthode principale
        }
    }

    async getNotifications(options: {
        // userId?: number;
        title?: string;
        body?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        notifications: Notification[];
        total: number;
        page: number;
        limit: number;
    }> {
        const {
            // userId,
            title,
            body,
            page = 1,
            limit = 20,
        } = options;

        const skip = (page - 1) * limit;

        // Créer la requête de base
        const query = this.notificationRepository
            .createQueryBuilder('notifications')
            .select([
                'notifications.id',
                'notifications.title',
                'notifications.body',
                'notifications.createdAt'
            ]);

        // Filtrer par utilisateur si spécifié
        // if (userId) {
        //   query.innerJoin(
        //     'notification.notificationUtilisateurs',
        //     'nu',
        //     'nu.utilisateurId = :userId',
        //     { userId }
        //   );
        // }

        // Appliquer les filtres de recherche
        if (title) {
            query.andWhere('notifications.title ILIKE :title', {
                title: `%${title}%`
            });
        }

        if (body) {
            query.andWhere('notifications.body ILIKE :body', {
                body: `%${body}%`
            });
        }

        // Ordonner par date de création (plus récent d'abord)
        query.orderBy('notifications.createdAt', 'DESC');

        // Pagination
        query.skip(skip).take(limit);

        // Récupérer les données et le total
        const [notifications, total] = await query.getManyAndCount();

        return {
            notifications,
            total,
            page,
            limit,
        };
    }


    /**
     * Crée et stocke une notification dans la base de données
     */
    async createAndStoreNotification(dto: {
        title: string;
        body: string;
    }): Promise<Notification> {
        const notification = this.notificationRepository.create({
            title: dto.title,
            body: dto.body,
        });

        const savedNotification = await this.notificationRepository.save(notification);

        return savedNotification;
    }

    /**
     * Envoi de notification avec stockage préalable
     */
    // async sendNotification(dto: SendNotificationDto) {
    //   // 1. D'abord, stocker la notification dans la base
    //   const notification = await this.createAndStoreNotification({
    //     title: dto.title,
    //     body: dto.body,
    //   });

    //   // 2. Préparer le payload pour Firebase
    //   const payload: NotificationPayload = {
    //     title: dto.title,
    //     body: dto.body,
    //   };

    //   let firebaseResult;

    //   // 3. Envoyer la notification via Firebase (en arrière-plan)
    //   this.sendFirebaseNotificationAsync({
    //     dto,
    //     payload,
    //   }).catch(error => {
    //     this.logger.error(`Erreur lors de l'envoi asynchrone: ${error.message}`);
    //   });

    //   return {

    //     message: 'Notification créée avec succès, envoi en cours...',
    //   };
    // }

    /**
     * Envoi asynchrone des notifications Firebase (ne bloque pas le processus)
     */
    // private async sendFirebaseNotificationAsync(params: {
    //   dto: SendNotificationDto;
    //   payload: NotificationPayload;
    // }) {
    //   try {
    //     const { dto, payload } = params;

    //     if (dto.topic) {
    //       await this.firebaseService.sendToTopic(dto.topic, payload);
    //       this.logger.log(`Notification ${dto.title} envoyée au topic: ${dto.topic}`);

    //     } else if (dto.condition) {
    //       await this.firebaseService.sendWithCondition(dto.condition, payload);
    //       this.logger.log(`Notification ${dto.title} envoyée avec condition: ${dto.condition}`);

    //     } else if (dto.tokens && dto.tokens.length > 0) {
    //       await this.firebaseService.sendToTokens({
    //         tokens: dto.tokens,
    //         payload,
    //       });
    //       this.logger.log(`Notification ${dto.title} envoyée à ${dto.tokens.length} tokens`);

    //     } else {
    //       // Récupérer tous les tokens
    //       const allTokens = await this.getAllFcmTokens();

    //       if (allTokens.length === 0) {
    //         this.logger.warn(`Aucun token FCM trouvé pour la notification ${dto.title}`);
    //         return;
    //       }

    //       await this.firebaseService.sendToTokens({
    //         tokens: allTokens,
    //         payload,
    //       });
    //       this.logger.log(`Notification ${dto.title} envoyée à ${allTokens.length} tokens`);
    //     }

    //     // Optionnel: Marquer la notification comme envoyée
    //     // await this.notificationRepository.update(dto.title, {
    //     //   data: {
    //     //     ...dto.title,
    //     //     firebaseSent: true,
    //     //     sentAt: new Date(),
    //     //   },
    //     // });

    //   } catch (error) {
    //     this.logger.error(`Erreur Firebase pour notification ${params.dto.title}: ${error.message}`);

    //     // Marquer l'erreur dans la notification
    //     // await this.notificationRepository.update(params.dto.title, {
    //     //   data: {
    //     //     ...params.dto.title,
    //     //     firebaseError: error.message,
    //     //     firebaseSent: false,
    //     //   },
    //     // });
    //   }
    // }

    /**
    * Récupérer TOUS les tokens FCM depuis la table utilisateur
    */
    private async getAllFcmTokens(): Promise<string[]> {

        const users = await this.utilisateurRepository.find({
            // where: {
            //   fcm_token: Not(IsNull()),
            // },
            select: ['fcm_token'],
        });

        // Extraire et filtrer les tokens
        return users
            .map(user => user.fcm_token)
            .filter((token): token is string =>
                token !== null &&
                token !== undefined &&
                token.trim().length > 0
            );
    }

    async subscribeToTopic(tokens: string[], topic: string) {
        return await this.firebaseService.subscribeToTopic(tokens, topic);
    }

    async unsubscribeFromTopic(tokens: string[], topic: string) {
        return await this.firebaseService.unsubscribeFromTopic(tokens, topic);
    }

    async validateToken(token: string) {
        return await this.firebaseService.validateToken(token);
    }
}