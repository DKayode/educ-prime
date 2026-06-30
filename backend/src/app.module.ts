import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { EtablissementsModule } from './etablissements/etablissements.module';
import { FilieresModule } from './filieres/filieres.module';
import { NiveauEtudeModule } from './niveau-etude/niveau-etude.module';
import { MatieresModule } from './matieres/matieres.module';
import { EpreuvesModule } from './epreuves/epreuves.module';
import { RessourcesModule } from './ressources/ressources.module';
import { FichiersModule } from './fichiers/fichiers.module';
import { FilesModule } from './files/files.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Utilisateur } from './utilisateurs/entities/utilisateur.entity';
import { Etablissement } from './etablissements/entities/etablissement.entity';
import { Filiere } from './filieres/entities/filiere.entity';
import { Matiere } from './matieres/entities/matiere.entity';
import { Epreuve } from './epreuves/entities/epreuve.entity';
import { Ressource } from './ressources/entities/ressource.entity';
import { Concours } from './concours/entities/concours.entity';
import { Publicite } from './publicites/entities/publicite.entity';
import { Evenement } from './evenements/entities/evenement.entity';
import { Opportunite } from './opportunites/entities/opportunite.entity';

import { WalletEntity } from './wallet/src/payment/payment.entities';
import { WalletTransactionEntity } from './wallet/src/payment/payment.entities';
import { WalletRestrictionEntity } from './wallet/src/payment/payment.entities';
import { WithdrawalRequestEntity } from './wallet/src/payment/payment.entities';
import { PaymentExecutionEntity } from './wallet/src/payment/payment.entities';
import { PaymentProofEntity } from './wallet/src/payment/payment.entities';
import { PaymentConfigurationEntity } from './wallet/src/payment/payment.entities';
import { UserPaymentAccountEntity } from './wallet/src/payment/payment.entities';
import { UserPaymentAccountHistoryEntity } from './wallet/src/payment/payment.entities';
import { PaymentBatchEntity } from './wallet/src/payment/payment.entities';
import { PaymentAuditLogEntity } from './wallet/src/payment/payment.entities';
import { PaymentNotificationEntity } from './wallet/src/payment/payment.entities';

import { ContactsProfessionnel } from './contacts-professionnels/entities/contacts-professionnel.entity';
import { PublicitesModule } from './publicites/publicites.module';
import { EvenementsModule } from './evenements/evenements.module';
import { OpportunitesModule } from './opportunites/opportunites.module';
import { ConcoursModule } from './concours/concours.module';
import { ContactsProfessionnelsModule } from './contacts-professionnels/contacts-professionnels.module';
import { ParcoursModule } from './parcours/parcours.module';
import { FavorisModule } from './favoris/favoris.module';
import { LikesModule } from './likes/likes.module';
import { CommentairesModule } from './commentaires/commentaires.module';
import { Parcour } from './parcours/entities/parcour.entity';
import { Commentaire } from './commentaires/entities/commentaire.entity';
import { Like } from './likes/entities/like.entity';
import { Favori } from './favoris/entities/favoris.entity';
import { Category } from './categories/entities/category.entity';
import { CategoriesModule } from './categories/categories.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AppVersionModule } from './app-version/app-version.module';
import { Notification } from './notifications/entities/notification.entity';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { ForumModule } from './forum/forum.module';
import { LikesPolymorphicModule } from './likes-polymorphic/likes-polymorphic.module';
import { CommentsPolymorphicModule } from './comments-polymorphic/comments-polymorphic.module';
import { ServicesModule } from './services/services.module';
import { AvisModule } from './avis/avis.module';
import { TypesModule } from './types/types.module';
import { PrestatairesModule } from './prestataires/prestataires.module';
import { RecruteursModule } from './recruteurs/recruteurs.module';
import { CompetencesModule } from './competences/competences.module';
import { OffresModule } from './offres/offres.module';
import { NotificationEmailModule } from './notification-email/notification-email.module';
import { BullModule } from '@nestjs/bullmq';
import { CountryConfigModule } from './config/country-config.module';
import { CountryMiddleware } from './config/country.middleware';
import { PaymentModule } from './wallet/src/payment/payment.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CountryConfigModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? true : false,
      extra: process.env.DATABASE_URL?.includes('sslmode=require') ? {
        ssl: {
          rejectUnauthorized: false,
        },
      } : undefined,
    }),
    TypeOrmModule.forFeature([
      Utilisateur,
      Etablissement,
      Filiere,
      Matiere,
      Epreuve,
      Ressource,
      Publicite,
      Evenement,
      Opportunite,
      Concours,
      ContactsProfessionnel,
      Parcour,
      Commentaire,
      Like,
      Favori,
      Category,
      Notification,
      WalletEntity,
      WalletTransactionEntity,
      WalletRestrictionEntity,
      WithdrawalRequestEntity,
      PaymentExecutionEntity,
      PaymentProofEntity,
      PaymentConfigurationEntity,
      UserPaymentAccountEntity,
      UserPaymentAccountHistoryEntity,
      PaymentBatchEntity,
      PaymentAuditLogEntity,
      PaymentNotificationEntity,
    ]),
    AuthModule,
    UtilisateursModule,
    EtablissementsModule,
    FilieresModule,
    NiveauEtudeModule,
    MatieresModule,
    EpreuvesModule,
    RessourcesModule,
    FichiersModule,
    FilesModule,
    PublicitesModule,
    EvenementsModule,
    OpportunitesModule,
    ConcoursModule,
    ContactsProfessionnelsModule,
    ParcoursModule,
    CommentairesModule,
    LikesModule,
    FavorisModule,
    CategoriesModule,
    NotificationsModule,
    NotificationEmailModule,
    FirebaseModule,
    AppVersionModule,
    EventsModule,
    PrismaModule,
    ForumModule,
    LikesPolymorphicModule,
    CommentsPolymorphicModule,
    ServicesModule,
    AvisModule,
    TypesModule,
    PrestatairesModule,
    RecruteursModule,
    CompetencesModule,
    OffresModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CountryMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}