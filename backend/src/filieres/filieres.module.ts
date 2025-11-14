import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilieresController } from './filieres.controller';
import { FilieresService } from './filieres.service';
import { Filiere } from './entities/filiere.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Filiere])],
  controllers: [FilieresController],
  providers: [FilieresService],
  exports: [FilieresService],
})
export class FilieresModule {}