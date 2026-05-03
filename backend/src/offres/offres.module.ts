import { Module } from '@nestjs/common';
import { OffresService } from './offres.service';
import { OffresController } from './offres.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offre } from './entities/offre.entity';
import { Type } from '../types/entities/type.entity';
import { Competence } from '../competences/entities/competence.entity';
import { FichiersModule } from '../fichiers/fichiers.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Offre, Type, Competence]), FichiersModule, MailModule],
  providers: [OffresService],
  controllers: [OffresController]
})
export class OffresModule { }
