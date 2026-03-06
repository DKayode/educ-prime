import { Module } from '@nestjs/common';
import { CompetencesService } from './competences.service';
import { CompetencesController } from './competences.controller';

@Module({
  providers: [CompetencesService],
  controllers: [CompetencesController]
})
export class CompetencesModule {}
