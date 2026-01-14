import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { NotificationUtilisateur } from './entities/notification-utilisateur.entity';
import { Notification } from './entities/notification.entity';
import { NotificationUtilisateur } from './entities/notification-utilisateur.entity';

@Module({
  imports: [
    FirebaseModule,
    UtilisateursModule,
    TypeOrmModule.forFeature([Notification, NotificationUtilisateur]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule { }