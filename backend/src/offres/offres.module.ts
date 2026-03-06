import { Module } from '@nestjs/common';
import { OffresService } from './offres.service';
import { OffresController } from './offres.controller';
import { FichiersModule } from '../fichiers/fichiers.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [FichiersModule, MailModule],
  providers: [OffresService],
  controllers: [OffresController]
})
export class OffresModule { }
