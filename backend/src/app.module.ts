import { Module, Logger } from '@nestjs/common';
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

const logger = new Logger('DatabaseConfig');

// Log database configuration
const dbConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD ? '***' : 'postgres(default)',
  database: process.env.DB_NAME || 'educ_prime',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
};

logger.log('=== Database Configuration ===');
logger.log(`Host: ${dbConfig.host}`);
logger.log(`Port: ${dbConfig.port}`);
logger.log(`Username: ${dbConfig.username}`);
logger.log(`Password: ${dbConfig.password}`);
logger.log(`Database: ${dbConfig.database}`);
logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
logger.log(`Synchronize: ${dbConfig.synchronize}`);
logger.log('==============================');

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
      logging: process.env.NODE_ENV !== 'production',
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