import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpreuveSubmission } from './entities/epreuve-submission.entity';
import { EpreuveSubmissionsController } from './epreuve-submissions.controller';
import { EpreuveSubmissionsService } from './epreuve-submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EpreuveSubmission]),
  ],
  controllers: [EpreuveSubmissionsController],
  providers: [EpreuveSubmissionsService],
  exports: [EpreuveSubmissionsService],
})
export class EpreuveSubmissionsModule { }
