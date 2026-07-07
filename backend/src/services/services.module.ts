import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';
import { Type } from '../types/entities/type.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { Prestataire } from '../prestataires/entities/prestataire.entity';
import { Avis } from '../avis/entities/avis.entity';
import { MailModule } from '../mail/mail.module';
import { FichiersModule } from '../fichiers/fichiers.module';
import { TypeProfilsModule } from '../type-profils/type-profils.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, Type, Utilisateur, Prestataire, Avis]),
    MailModule,
    FichiersModule,
    TypeProfilsModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService]
})
export class ServicesModule { }
