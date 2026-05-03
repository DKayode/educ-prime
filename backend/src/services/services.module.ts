import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';
import { MailModule } from '../mail/mail.module';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Service]), MailModule, FichiersModule],
  controllers: [ServicesController],
  providers: [ServicesService]
})
export class ServicesModule { }
