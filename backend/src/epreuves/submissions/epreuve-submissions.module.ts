import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpreuveSubmission } from './entities/epreuve-submission.entity';
import { EpreuveSubmissionsController } from './epreuve-submissions.controller';
import { EpreuveSubmissionsService } from './epreuve-submissions.service';
import { MailModule } from '../../mail/mail.module';
import { FilesModule } from '../../files/files.module';
import { WalletModule } from '../../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EpreuveSubmission]),
    MailModule,
    FilesModule,
    WalletModule,
  ],
  controllers: [EpreuveSubmissionsController],
  providers: [EpreuveSubmissionsService],
  exports: [EpreuveSubmissionsService],
})
export class EpreuveSubmissionsModule { }
