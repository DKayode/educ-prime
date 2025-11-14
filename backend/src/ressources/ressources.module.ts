import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RessourcesController } from './ressources.controller';
import { RessourcesService } from './ressources.service';
import { Ressource } from './entities/ressource.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ressource])],
  controllers: [RessourcesController],
  providers: [RessourcesService],
  exports: [RessourcesService],
})
export class RessourcesModule {}