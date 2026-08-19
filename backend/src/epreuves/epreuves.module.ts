import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpreuvesController } from './epreuves.controller';
import { EpreuvesService } from './epreuves.service';
import { Epreuve } from './entities/epreuve.entity';
import { FichiersModule } from '../fichiers/fichiers.module';
import { ResourceAccessModule } from '../resource-access/resource-access.module';
import { KessiahModule } from '../kessiah/kessiah.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Epreuve]),
    FichiersModule,
    ResourceAccessModule,
    // Pour joindre à chaque épreuve son état de lecture (voir findAll).
    KessiahModule,
  ],
  controllers: [EpreuvesController],
  providers: [EpreuvesService],
  exports: [EpreuvesService],
})
export class EpreuvesModule { }