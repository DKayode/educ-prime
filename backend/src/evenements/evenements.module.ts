import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvenementsService } from './evenements.service';
import { EvenementsController } from './evenements.controller';
import { Evenement } from './entities/evenement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Evenement])],
  controllers: [EvenementsController],
  providers: [EvenementsService],
})
export class EvenementsModule { }
