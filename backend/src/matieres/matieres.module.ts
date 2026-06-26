import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatieresController } from './matieres.controller';
import { MatieresService } from './matieres.service';
import { Matiere } from './entities/matiere.entity';
import { NiveauEtude } from '../niveau-etude/entities/niveau-etude.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Matiere, NiveauEtude])],
  controllers: [MatieresController],
  providers: [MatieresService],
  exports: [MatieresService],
})
export class MatieresModule {}