import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamenNational } from './entities/examen-national.entity';
import { ExamenNationalSubmission } from './entities/examen-national-submission.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { Serie } from '../series/entities/serie.entity';
import { MatiereFiliereExamen } from '../matieres-filieres-examen/entities/matiere-filiere-examen.entity';
import { ExamensNationauxController } from './examens-nationaux.controller';
import { ExamensNationauxService } from './examens-nationaux.service';
import { ExamensNationauxSubmissionsController } from './examens-nationaux-submissions.controller';
import { ExamensNationauxSubmissionsService } from './examens-nationaux-submissions.service';
import { MailModule } from '../mail/mail.module';
import { FilesModule } from '../files/files.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ExamenNational, ExamenNationalSubmission, TypeExamen, Serie, MatiereFiliereExamen]),
        MailModule,
        FilesModule,
        WalletModule,
    ],
    // Submissions controller FIRST: its literal `/examens-nationaux/submissions`
    // routes must register before the main `/examens-nationaux/:id` route.
    controllers: [ExamensNationauxSubmissionsController, ExamensNationauxController],
    providers: [ExamensNationauxService, ExamensNationauxSubmissionsService],
    exports: [ExamensNationauxService],
})
export class ExamensNationauxModule { }
