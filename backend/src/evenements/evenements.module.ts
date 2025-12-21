import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvenementsService } from './evenements.service';
import { EvenementsController } from './evenements.controller';
import { Evenement } from './entities/evenement.entity';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evenement]),
    FichiersModule,
  ],
  controllers: [EvenementsController],
  providers: [EvenementsService],
})
export class EvenementsModule { }
