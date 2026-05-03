import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetencesService } from './competences.service';
import { CompetencesController } from './competences.controller';
import { Competence } from './entities/competence.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Competence])],
  providers: [CompetencesService],
  controllers: [CompetencesController]
})
export class CompetencesModule {}
