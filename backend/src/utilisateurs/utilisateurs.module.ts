import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilisateursController } from './utilisateurs.controller';
import { UtilisateursService } from './utilisateurs.service';
import { Utilisateur } from './entities/utilisateur.entity';

import { FichiersModule } from 'src/fichiers/fichiers.module';
import { NotificationUtilisateur } from 'src/notifications/entities/notification-utilisateur.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, NotificationUtilisateur]), FichiersModule],
  controllers: [UtilisateursController],
  providers: [UtilisateursService],
  exports: [UtilisateursService, TypeOrmModule.forFeature([Utilisateur])],
})
export class UtilisateursModule { }