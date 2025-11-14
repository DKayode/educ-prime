import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatieresController } from './matieres.controller';
import { MatieresService } from './matieres.service';
import { Matiere } from './entities/matiere.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Matiere])],
  controllers: [MatieresController],
  providers: [MatieresService],
  exports: [MatieresService],
})
export class MatieresModule {}