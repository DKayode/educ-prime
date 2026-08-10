import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesService } from './series.service';
import { SeriesController } from './series.controller';
import { Serie } from './entities/serie.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Serie, TypeExamen])],
  controllers: [SeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
