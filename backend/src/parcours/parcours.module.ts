import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcoursService } from './parcours.service';
import { ParcoursController } from './parcours.controller';
import { Parcour } from './entities/parcour.entity';

import { FichiersModule } from 'src/fichiers/fichiers.module';
import { Favori } from 'src/favoris/entities/favoris.entity';
import { Like } from 'src/likes/entities/like.entity';
import { Commentaire } from 'src/commentaires/entities/commentaire.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcour, Commentaire, Like, Favori]),
    FichiersModule,
  ],
  controllers: [ParcoursController],
  providers: [ParcoursService],
  exports: [ParcoursService],
})
export class ParcoursModule { }