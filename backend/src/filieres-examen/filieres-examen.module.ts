import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilieresExamenService } from './filieres-examen.service';
import { FilieresExamenController } from './filieres-examen.controller';
import { FiliereExamen } from './entities/filiere-examen.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FiliereExamen, TypeExamen])],
  controllers: [FilieresExamenController],
  providers: [FilieresExamenService],
  exports: [FilieresExamenService],
})
export class FilieresExamenModule {}
