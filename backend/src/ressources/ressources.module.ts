import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RessourcesController } from './ressources.controller';
import { RessourcesService } from './ressources.service';
import { Ressource } from './entities/ressource.entity';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ressource]),
    FichiersModule,
  ],
  controllers: [RessourcesController],
  providers: [RessourcesService],
  exports: [RessourcesService],
})
export class RessourcesModule { }