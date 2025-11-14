import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpreuvesController } from './epreuves.controller';
import { EpreuvesService } from './epreuves.service';
import { Epreuve } from './entities/epreuve.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Epreuve])],
  controllers: [EpreuvesController],
  providers: [EpreuvesService],
  exports: [EpreuvesService],
})
export class EpreuvesModule {}