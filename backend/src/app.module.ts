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
import { EpreuveSubmissionsModule } from './epreuves/submissions/epreuve-submissions.module';
import { FichiersModule } from './fichiers/fichiers.module';
import { FilesModule } from './files/files.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Utilisateur } from './utilisateurs/entities/utilisateur.entity';
import { Etablissement } from './etablissements/entities/etablissement.entity';
import { Filiere } from './filieres/entities/filiere.entity';
import { Matiere } from './matieres/entities/matiere.entity';
import { Epreuve } from './epreuves/entities/epreuve.entity';
import { Concours } from './concours/entities/concours.entity';
import { Publicite } from './publicites/entities/publicite.entity';
import { Evenement } from './evenements/entities/evenement.entity';
import { Opportunite } from './opportunites/entities/opportunite.entity';

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
import { StructureModule } from './structure/structure.module';
import { Structure } from './structure/entities/structure.entity';
import { TitreModule } from './titre/titre.module';
import { Titre } from './titre/entities/titre.entity';
import { DepartementModule } from './departements/departement.module';
import { VilleModule } from './villes/ville.module';
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
import { KpiModule } from './kpi/kpi.module';
import { SubmissionsStatsModule } from './submissions-stats/submissions-stats.module';
import { WalletModule } from './wallet/wallet.module';
import { NotificationEmailModule } from './notification-email/notification-email.module';
import { BullModule } from '@nestjs/bullmq';
import { CountryConfigModule } from './config/country-config.module';
import { CountryMiddleware } from './config/country.middleware';

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
      Structure,
      Titre,
      Notification
    ]),
    AuthModule,
    UtilisateursModule,
    EtablissementsModule,
    FilieresModule,
    NiveauEtudeModule,
    MatieresModule,
    EpreuveSubmissionsModule,
    EpreuvesModule,
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
    StructureModule,
    TitreModule,
    DepartementModule,
    VilleModule,
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
    KpiModule,
    SubmissionsStatsModule,
    WalletModule,
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