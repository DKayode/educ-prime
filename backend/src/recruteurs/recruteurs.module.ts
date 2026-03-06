import { Module } from '@nestjs/common';
import { RecruteursService } from './recruteurs.service';
import { RecruteursController } from './recruteurs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FichiersModule } from '../fichiers/fichiers.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, FichiersModule, MailModule],
  controllers: [RecruteursController],
  providers: [RecruteursService],
})
export class RecruteursModule { }
