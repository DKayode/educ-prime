import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcoursService } from './parcours.service';
import { ParcoursController } from './parcours.controller';
import { Parcour } from './entities/parcour.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parcour])],
  controllers: [ParcoursController],
  providers: [ParcoursService],
  exports: [ParcoursService],
})
export class ParcoursModule { }