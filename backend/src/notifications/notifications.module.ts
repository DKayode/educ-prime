import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationUtilisateur } from './entities/notification-utilisateur.entity';
import { BullModule } from '@nestjs/bullmq';
import { PushProcessor } from './push.processor';

@Module({
  imports: [
    FirebaseModule,
    UtilisateursModule,
    TypeOrmModule.forFeature([Notification, NotificationUtilisateur]),
    BullModule.registerQueue({
      name: 'push',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule { }