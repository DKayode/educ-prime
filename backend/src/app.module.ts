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
    AuthModule,
    UtilisateursModule,
    EtablissementsModule,
    FilieresModule,
    NiveauEtudeModule,
    MatieresModule,
    EpreuvesModule,
    RessourcesModule,
    FichiersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}