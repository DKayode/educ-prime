import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { EtablissementsModule } from './etablissements/etablissements.module';
import { FilieresModule } from './filieres/filieres.module';
import { NiveauEtudeModule } from './niveau-etude/niveau-etude.module';
import { MatieresModule } from './matieres/matieres.module';
import { EpreuvesModule } from './epreuves/epreuves.module';
import { EpreuveSubmissionsModule } from './epreuves/submissions/epreuve-submissions.module';
import { KessiahModule } from './kessiah/kessiah.module';
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
import { TypeProfilsModule } from './type-profils/type-profils.module';
import { StructureModule } from './structure/structure.module';
import { Structure } from './structure/entities/structure.entity';
import { TitreModule } from './titre/titre.module';
import { TypesExamenModule } from './types-examen/types-examen.module';
import { SeriesModule } from './series/series.module';
import { MatieresExamenModule } from './matieres-examen/matieres-examen.module';
import { FilieresExamenModule } from './filieres-examen/filieres-examen.module';
import { ExamensNationauxModule } from './examens-nationaux/examens-nationaux.module';
import { Titre } from './titre/entities/titre.entity';
import { DepartementModule } from './departements/departement.module';
import { VilleModule } from './villes/ville.module';
import { FormsModule } from './forms/forms.module';
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

// pino-pretty is a devDependency, so it's absent from the prod-only Docker
// runtime image (`npm install --only=production`). Only use the pretty
// transport when it's actually resolvable — otherwise a docker dev stack
// (NODE_ENV=development on that image) would crash with
// "unable to determine transport target for pino-pretty". Falls back to JSON.
const prettyLogsAvailable = (() => {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
})();

@Module({
  imports: [
    // Structured JSON logging (pino). In prod every log line is one JSON
    // object (shipped by Vector -> Loki -> R2 in the log pipeline); in dev it
    // renders human-readable via pino-pretty. Setting app.useLogger() in
    // main.ts routes every existing `new Logger(context)` call through this,
    // so no call sites change. Sensitive request/response headers are redacted
    // at the source; app-level scrubbing is layered again in Vector.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        // Pretty single-line in dev when pino-pretty is installed; JSON otherwise.
        transport:
          process.env.NODE_ENV !== 'production' && prettyLogsAvailable
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        // Emit level as a string ("info") instead of a number — friendlier in Loki.
        formatters: { level: (label) => ({ level: label }) },
        // Stable label so the pipeline can key logs by service.
        base: { service: 'edukia-backend' },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-infobip-webhook-secret"]',
            'req.headers["x-api-key"]',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        // Drop health/root pings from the auto HTTP access logs.
        autoLogging: {
          ignore: (req) => req.url === '/' || req.url === '/health',
        },
      },
    }),
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
    KessiahModule,
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
    TypeProfilsModule,
    StructureModule,
    TitreModule,
    TypesExamenModule,
    SeriesModule,
    MatieresExamenModule,
    FilieresExamenModule,
    ExamensNationauxModule,
    DepartementModule,
    VilleModule,
    FormsModule,
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