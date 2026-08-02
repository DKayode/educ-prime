import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatieresFilieresExamenService } from './matieres-filieres-examen.service';
import { MatieresFilieresExamenController } from './matieres-filieres-examen.controller';
import { MatiereFiliereExamen } from './entities/matiere-filiere-examen.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MatiereFiliereExamen, TypeExamen])],
  controllers: [MatieresFilieresExamenController],
  providers: [MatieresFilieresExamenService],
  exports: [MatieresFilieresExamenService],
})
export class MatieresFilieresExamenModule {}
