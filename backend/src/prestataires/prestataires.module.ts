import { Module } from '@nestjs/common';
import { PrestatairesController } from './prestataires.controller';
import { PrestatairesService } from './prestataires.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prestataire } from './entities/prestataire.entity';
import { Competence } from '../competences/entities/competence.entity';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Prestataire, Competence]), FichiersModule],
  controllers: [PrestatairesController],
  providers: [PrestatairesService],
})
export class PrestatairesModule { }
