import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Concours } from './entities/concours.entity';
import { ConcoursController } from './concours.controller';
import { ConcoursService } from './concours.service';
import { FichiersModule } from '../fichiers/fichiers.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Concours]),
    FichiersModule,
    MailModule,
  ],
  controllers: [ConcoursController],
  providers: [ConcoursService],
  exports: [ConcoursService],
})
export class ConcoursModule { }
