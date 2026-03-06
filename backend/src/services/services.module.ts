import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { MailModule } from '../mail/mail.module';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [MailModule, FichiersModule],
  controllers: [ServicesController],
  providers: [ServicesService]
})
export class ServicesModule { }
