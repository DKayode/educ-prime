import { Injectable } from '@nestjs/common';
import { FirebaseService, NotificationPayload } from '../firebase/firebase.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly firebaseService: FirebaseService) { }

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
      return await this.firebaseService.sendToTokens({
        tokens: dto.tokens,
        payload,
      });
    } else {
      throw new Error('Aucun destinataire spécifié (tokens, topic ou condition)');
    }
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