import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpreuvesController } from './epreuves.controller';
import { EpreuvesService } from './epreuves.service';
import { Epreuve } from './entities/epreuve.entity';
import { FichiersModule } from '../fichiers/fichiers.module';
import { ResourceAccessModule } from '../resource-access/resource-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Epreuve]),
    FichiersModule,
    ResourceAccessModule,
  ],
  controllers: [EpreuvesController],
  providers: [EpreuvesService],
  exports: [EpreuvesService],
})
export class EpreuvesModule { }