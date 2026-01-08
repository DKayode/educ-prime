import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService, NotificationPayload } from '../firebase/firebase.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);


  constructor(private readonly firebaseService: FirebaseService,
    @InjectRepository(Utilisateur)
    private utilisateurRepository: Repository<Utilisateur>,) { }

  // async sendNotification(dto: SendNotificationDto) {
  //   const payload: NotificationPayload = {
  //     title: dto.title,
  //     body: dto.body,
  //     data: dto.data,
  //     imageUrl: dto.imageUrl,
  //   };

  //   if (dto.topic) {
  //     return await this.firebaseService.sendToTopic(dto.topic, payload);
  //   } else if (dto.condition) {
  //     return await this.firebaseService.sendWithCondition(dto.condition, payload);
  //   } else if (dto.tokens) {
  //     return await this.firebaseService.sendToTokens({
  //       tokens: dto.tokens,
  //       payload,
  //     });
  //   } else {
  //     throw new Error('Aucun destinataire spécifié (tokens)');
  //   }
  // }

  async sendNotification(dto: SendNotificationDto) {
    const payload: NotificationPayload = {
      title: dto.title,
      body: dto.body,
      data: dto.data,
      imageUrl: dto.imageUrl,
    };

    if (dto.topic) {
      return await this.firebaseService.sendToTopic(dto.topic, payload);

    } else if (dto.condition) {
      return await this.firebaseService.sendWithCondition(dto.condition, payload);

    } else if (dto.tokens) {
      // Si des tokens sont fournis, on les utilise directement
      return await this.firebaseService.sendToTokens({
        tokens: dto.tokens,
        payload,
      });

    } else {
      // Si aucun destinataire n'est spécifié, on récupère TOUS les tokens de la base
      const allTokens = await this.getAllFcmTokens();

      if (allTokens.length === 0) {
        throw new Error('Aucun token FCM trouvé dans la base de données');
      }

      this.logger.log(`Envoi à ${allTokens.length} tokens récupérés depuis la base`);

      return await this.firebaseService.sendToTokens({
        tokens: allTokens,
        payload,
      });
    }
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