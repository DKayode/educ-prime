import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatieresExamenService } from './matieres-examen.service';
import { MatieresExamenController } from './matieres-examen.controller';
import { MatiereExamen } from './entities/matiere-examen.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MatiereExamen, TypeExamen])],
  controllers: [MatieresExamenController],
  providers: [MatieresExamenService],
  exports: [MatieresExamenService],
})
export class MatieresExamenModule {}
