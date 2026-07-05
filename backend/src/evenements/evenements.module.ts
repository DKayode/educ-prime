import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvenementsService } from './evenements.service';
import { EvenementsController } from './evenements.controller';
import { Evenement } from './entities/evenement.entity';
import { FichiersModule } from '../fichiers/fichiers.module';
import { TypeProfilsModule } from '../type-profils/type-profils.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evenement]),
    FichiersModule,
    TypeProfilsModule,
  ],
  controllers: [EvenementsController],
  providers: [EvenementsService],
})
export class EvenementsModule { }
