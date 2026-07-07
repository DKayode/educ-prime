import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartementController } from './departement.controller';
import { DepartementService } from './departement.service';
import { Departement } from './entities/departement.entity';
import { Ville } from '../villes/entities/ville.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Departement, Ville])],
  controllers: [DepartementController],
  providers: [DepartementService],
  exports: [DepartementService],
})
export class DepartementModule {}
