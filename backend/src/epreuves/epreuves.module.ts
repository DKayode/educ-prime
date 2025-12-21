import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpreuvesController } from './epreuves.controller';
import { EpreuvesService } from './epreuves.service';
import { Epreuve } from './entities/epreuve.entity';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Epreuve]),
    FichiersModule,
  ],
  controllers: [EpreuvesController],
  providers: [EpreuvesService],
  exports: [EpreuvesService],
})
export class EpreuvesModule { }