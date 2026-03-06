import { Module } from '@nestjs/common';
import { PrestatairesController } from './prestataires.controller';
import { PrestatairesService } from './prestataires.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [PrismaModule, FichiersModule],
  controllers: [PrestatairesController],
  providers: [PrestatairesService],
})
export class PrestatairesModule { }
