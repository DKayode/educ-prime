import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsProfessionnelsService } from './contacts-professionnels.service';
import { ContactsProfessionnelsController } from './contacts-professionnels.controller';
import { ContactsProfessionnel } from './entities/contacts-professionnel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactsProfessionnel])],
  controllers: [ContactsProfessionnelsController],
  providers: [ContactsProfessionnelsService],
})
export class ContactsProfessionnelsModule { }
