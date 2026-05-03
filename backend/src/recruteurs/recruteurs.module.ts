import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruteursService } from './recruteurs.service';
import { RecruteursController } from './recruteurs.controller';
import { Recruteur } from './entities/recruteur.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { FichiersModule } from '../fichiers/fichiers.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Recruteur, Utilisateur]), FichiersModule, MailModule],
  controllers: [RecruteursController],
  providers: [RecruteursService],
})
export class RecruteursModule { }
