import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService, NotificationPayload } from '../firebase/firebase.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationUtilisateur } from './entities/notification-utilisateur.entity';
import { BadRequestException } from '@nestjs/common';
import { MarkNotificationAsReadDto } from './dto/mark-notification-read.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    @InjectRepository(Utilisateur)
    private utilisateurRepository: Repository<Utilisateur>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationUtilisateur)
    private notificationUtilisateurRepository: Repository<NotificationUtilisateur>,
  ) { }

  // emitParcoursNotifEvent(event: ParcoursNotifEvent) {
  //   this.eventEmitter.emit(NotificationEventType.PARCOURS_CREATED, event);
  //   this.logger.debug(`Événement émis: ${NotificationEventType.PARCOURS_CREATED}`, event);
  // }

  // emitEvenementNotifEvent(event: EvenementNotifEvent) {
  //   this.eventEmitter.emit(NotificationEventType.EVENEMENTS_CREATED, event);
  //   this.logger.debug(`Événement émis: ${NotificationEventType.EVENEMENTS_CREATED}`, event);
  // }

  // emitOpportuniteNotifEvent(event: OpportuniteNotifEvent) {
  //   this.eventEmitter.emit(NotificationEventType.OPPORTUNITEES_CREATED, event);
  //   this.logger.debug(`Événement émis: ${NotificationEventType.OPPORTUNITEES_CREATED}`, event);
  // }

  // emitConcoursNotifEvent(event: ConcoursNotifEvent) {
  //   this.eventEmitter.emit(NotificationEventType.CONCOURS_CREATED, event);
  //   this.logger.debug(`Événement émis: ${NotificationEventType.CONCOURS_CREATED}`, event);
  // }

  async sendNotification(dto: SendNotificationDto) {
    // 1. Créer et stocker la notification en base de données d'abord
    const notificationCreated = await this.createAndStoreNotification(dto);
    this.logger.log(`Notification ${notificationCreated.id} créée avec succès`);

    // 2. Déterminer les utilisateurs destinataires
    let utilisateurs: Utilisateur[] = [];
    let utilisateursIds: number[] = [];

    if (dto.utilisateurIds && dto.utilisateurIds.length > 0) {
      // Cas 1: Utilisateurs spécifiques
      utilisateurs = await this.utilisateurRepository.find({
        where: { id: In(dto.utilisateurIds) }
      });
      utilisateursIds = dto.utilisateurIds;
    } else {
      // Cas 3: Tous les utilisateurs
      utilisateurs = await this.utilisateurRepository.find();
      utilisateursIds = utilisateurs.map(u => u.id);
    }

    // 3. Créer les relations dans notification_utilisateurs
    if (utilisateursIds.length > 0) {
      await this.createNotificationUtilisateurRelations(
        notificationCreated.id,
        utilisateursIds
      );
    }

    // 4. Préparer le payload pour Firebase
    const payload: NotificationPayload = {
      title: dto.title,
      body: dto.body,
      data: {
        notificationId: notificationCreated.id.toString()
      },
    };

    // 5. Récupérer les tokens FCM des destinataires
    const tokens = utilisateurs
      .map(u => u.fcm_token)
      .filter((token): token is string =>
        token !== null &&
        token !== undefined &&
        token.trim().length > 0
      );

    // 6. Envoyer la notification Firebase (en arrière-plan)
    if (tokens.length > 0) {
      this.sendFirebaseNotificationAsync({
        type: 'tokens',
        target: tokens,
        payload,
        notificationId: notificationCreated.id,
      }).catch(error => {
        this.logger.error(`Erreur lors de l'envoi Firebase: ${error.message}`);
      });
    }

    // 7. Retourner la réponse
    return {
      success: true,
      message: 'Notification créée avec succès',
      notification: notificationCreated,
      notificationId: notificationCreated.id,
      destinatairesCount: utilisateursIds.length,
    };
  }

  /**
   * Crée les relations entre notification et utilisateurs
   */
  private async createNotificationUtilisateurRelations(
    notificationId: number,
    utilisateurIds: number[]
  ): Promise<void> {
    const relations = utilisateurIds.map(utilisateurId => {
      return this.notificationUtilisateurRepository.create({
        notificationId,
        utilisateurId,
        isRead: false,
        readAt: null,
      });
    });

    await this.notificationUtilisateurRepository.save(relations);
    this.logger.log(`${relations.length} relations créées pour la notification ${notificationId}`);
  }

  /**
 * Récupère les notifications d'un utilisateur avec leur statut de lecture
 */
  async getUserNotifications(
    utilisateurId: number,
    options: {
      read?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 20;
    const offset = (page - 1) * limit;

    // Construction de la requête SQL directe (évite les problèmes de relations)
    let query = `
      SELECT 
        n.id,
        n.title,
        n.body,
        n.type,
        n.priority,
        n.data,
        n.created_at as "createdAt",
        n.expires_at as "expiresAt",
        n.sender_id as "senderId",
        nu.is_read as "isRead",
        nu.read_at as "readAt"
      FROM notification_utilisateurs nu
      INNER JOIN notifications n ON n.id = nu.notification_id
      WHERE nu.utilisateur_id = $1
    `;

    const params: any[] = [utilisateurId];
    let paramIndex = 2;

    if (options.read !== undefined) {
      query += ` AND nu.is_read = $${paramIndex}`;
      params.push(options.read);
      paramIndex++;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Exécuter la requête
    const notifications = await this.notificationRepository.query(query, params);

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) as count
      FROM notification_utilisateurs nu
      WHERE nu.utilisateur_id = $1
    `;
    const countParams: any[] = [utilisateurId];

    if (options.read !== undefined) {
      countQuery += ` AND nu.is_read = $2`;
      countParams.push(options.read);
    }

    const countResult = await this.notificationRepository.query(countQuery, countParams);
    const total = parseInt(countResult[0].count, 10);

    // Compter les non lues
    const unreadResult = await this.notificationRepository.query(
      `SELECT COUNT(*) as count FROM notification_utilisateurs WHERE utilisateur_id = $1 AND is_read = false`,
      [utilisateurId]
    );
    const unreadCount = parseInt(unreadResult[0].count, 10);

    notifications.forEach(notification => {
      if (notification.data && typeof notification.data === 'string') {
        try {
          notification.data = JSON.parse(notification.data);
        } catch (e) {

        }
      }
    });

    return {
      notifications,
      total,
      page,
      limit,
      unreadCount,
    };
  }

  /**
   * Marquer une notification comme lue
   */
  async markNotificationAsRead(
    utilisateurId: number,
    dto: MarkNotificationAsReadDto
  ): Promise<NotificationUtilisateur> {
    const { notificationId, markAsRead = true } = dto;

    // Trouver la relation
    const relation = await this.notificationUtilisateurRepository.findOne({
      where: {
        notificationId,
        utilisateurId,
      },
    });

    if (!relation) {
      throw new BadRequestException(
        `Notification ${notificationId} non trouvée pour l'utilisateur ${utilisateurId}`
      );
    }

    // Mettre à jour le statut
    relation.isRead = markAsRead;
    relation.readAt = markAsRead ? new Date() : null;

    const updatedRelation = await this.notificationUtilisateurRepository.save(relation);

    this.logger.log(
      `Notification ${notificationId} marquée comme ${markAsRead ? 'lue' : 'non lue'} 
       pour l'utilisateur ${utilisateurId}`
    );

    return updatedRelation;
  }

  /**
   * Marquer toutes les notifications d'un utilisateur comme lues
   */
  async markAllNotificationsAsRead(utilisateurId: number): Promise<{ count: number }> {
    const result = await this.notificationUtilisateurRepository.update(
      {
        utilisateurId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    this.logger.log(`${result.affected} notifications marquées comme lues pour l'utilisateur ${utilisateurId}`);

    return { count: result.affected || 0 };
  }

  /**
   * Récupérer le nombre de notifications non lues
   */
  async getUnreadCount(utilisateurId: number): Promise<{ count: number }> {
    const count = await this.notificationUtilisateurRepository.count({
      where: {
        utilisateurId,
        isRead: false,
      },
    });

    return { count };
  }

  /**
   * Récupérer une notification spécifique avec son statut pour un utilisateur
   */
  async getNotificationDetails(
    notificationId: number,
    utilisateurId: number
  ): Promise<Notification & { isRead: boolean; readAt: Date | null }> {
    const relation = await this.notificationUtilisateurRepository.findOne({
      where: {
        notificationId,
        utilisateurId,
      },
      relations: ['notification'],
    });

    if (!relation) {
      throw new BadRequestException(
        `Notification ${notificationId} non trouvée pour l'utilisateur ${utilisateurId}`
      );
    }

    return {
      ...relation.notification,
      isRead: relation.isRead,
      readAt: relation.readAt,
    };
  }

  /**
   * Crée et stocke une notification dans la base de données
   */
  private async createAndStoreNotification(dto: SendNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      title: dto.title,
      body: dto.body,
      type: dto.type,
      priority: dto.priority,
      data: dto.data,
      senderId: dto.senderId,
      expiresAt: dto.expiresAt,
    });

    return await this.notificationRepository.save(notification);
  }

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
      // Marquer comme envoyée dans la base de données (optionnel)
      // Note: On ne peut pas mettre à jour "notificationId" car ce n'est pas une colonne
      // On met à jour seulement le champ "data" si nécessaire
      /*
      await this.notificationRepository.update(notificationId, {
        data: payload.data
      });
      */

    } catch (error) {
      this.logger.error(`Erreur Firebase pour notification ${params.notificationId}: ${error.message}`);

      // Enregistrer l'erreur dans la base de données (optionnel)
      // Enregistrer l'erreur dans la base de données (optionnel)
      // On doit récupérer l'objet data existant idéalement, ou écraser.
      // Ici on met à jour le champ data.
      await this.notificationRepository.update(params.notificationId, {
        data: {
          ...params.payload.data,
          firebaseError: error.message,
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


    // Appliquer les filtres de recherche
    if (title) {
      query.andWhere('unaccent(notifications.title) ILIKE unaccent(:title)', {
        title: `%${title}%`
      });
    }

    if (body) {
      query.andWhere('unaccent(notifications.body) ILIKE unaccent(:body)', {
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

  async subscribeToTopic(tokens: string | string[], topic: string) {
    return await this.firebaseService.subscribeToTopic(tokens, topic);
  }

  async unsubscribeFromTopic(tokens: string | string[], topic: string) {
    return await this.firebaseService.unsubscribeFromTopic(tokens, topic);
  }

  async validateToken(token: string) {
    return await this.firebaseService.validateToken(token);
  }
}