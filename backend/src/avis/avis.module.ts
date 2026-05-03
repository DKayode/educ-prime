import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvisController } from './avis.controller';
import { AvisService } from './avis.service';
import { Avis } from './entities/avis.entity';
import { Service } from '../services/entities/service.entity';
import { Offre } from '../offres/entities/offre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Avis, Service, Offre])],
  controllers: [AvisController],
  providers: [AvisService]
})
export class AvisModule {}
