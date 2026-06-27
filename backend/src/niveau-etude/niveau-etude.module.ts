import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NiveauEtudeController } from './niveau-etude.controller';
import { NiveauEtudeService } from './niveau-etude.service';
import { NiveauEtude } from './entities/niveau-etude.entity';
import { Filiere } from '../filieres/entities/filiere.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NiveauEtude, Filiere])],
  controllers: [NiveauEtudeController],
  providers: [NiveauEtudeService],
  exports: [NiveauEtudeService],
})
export class NiveauEtudeModule {}