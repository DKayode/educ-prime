import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcoursExamensService } from './concours-examens.service';
import { ConcoursExamensController } from './concours-examens.controller';
import { ConcoursExamen } from './entities/concours-examen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConcoursExamen])],
  controllers: [ConcoursExamensController],
  providers: [ConcoursExamensService],
})
export class ConcoursExamensModule { }
