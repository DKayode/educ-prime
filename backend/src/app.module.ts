import { Module } from '@nestjs/common';
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
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Utilisateur } from './utilisateurs/entities/utilisateur.entity';
import { Etablissement } from './etablissements/entities/etablissement.entity';
import { Filiere } from './filieres/entities/filiere.entity';
import { Matiere } from './matieres/entities/matiere.entity';
import { Epreuve } from './epreuves/entities/epreuve.entity';
import { Ressource } from './ressources/entities/ressource.entity';
import { Publicite } from './publicites/entities/publicite.entity';
import { Evenement } from './evenements/entities/evenement.entity';
import { Opportunite } from './opportunites/entities/opportunite.entity';
import { ConcoursExamen } from './concours-examens/entities/concours-examen.entity';
import { ContactsProfessionnel } from './contacts-professionnels/entities/contacts-professionnel.entity';
import { PublicitesModule } from './publicites/publicites.module';
import { EvenementsModule } from './evenements/evenements.module';
import { OpportunitesModule } from './opportunites/opportunites.module';
import { ConcoursExamensModule } from './concours-examens/concours-examens.module';
import { ContactsProfessionnelsModule } from './contacts-professionnels/contacts-professionnels.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'educ_prime',
      autoLoadEntities: true,
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
      ConcoursExamen,
      ContactsProfessionnel,
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
    PublicitesModule,
    EvenementsModule,
    OpportunitesModule,
    ConcoursExamensModule,
    ContactsProfessionnelsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }