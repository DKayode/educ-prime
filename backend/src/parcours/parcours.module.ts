import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcoursService } from './parcours.service';
import { ParcoursController } from './parcours.controller';
import { Parcour } from './entities/parcour.entity';

import { FichiersModule } from 'src/fichiers/fichiers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcour]),
    FichiersModule,
  ],
  controllers: [ParcoursController],
  providers: [ParcoursService],
  exports: [ParcoursService],
})
export class ParcoursModule { }