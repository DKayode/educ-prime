import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Concours } from './entities/concours.entity';
import { ConcoursSubmission } from './entities/concours-submission.entity';
import { ConcoursController } from './concours.controller';
import { ConcoursService } from './concours.service';
import { ConcoursSubmissionsController } from './concours-submissions.controller';
import { ConcoursSubmissionsService } from './concours-submissions.service';
import { FichiersModule } from '../fichiers/fichiers.module';
import { MailModule } from '../mail/mail.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Concours, ConcoursSubmission]),
    FichiersModule,
    MailModule,
    FilesModule,
  ],
  // ConcoursSubmissionsController FIRST: its literal `/concours/submissions`
  // routes must register before ConcoursController's `/concours/:id`.
  controllers: [ConcoursSubmissionsController, ConcoursController],
  providers: [ConcoursService, ConcoursSubmissionsService],
  exports: [ConcoursService],
})
export class ConcoursModule { }
