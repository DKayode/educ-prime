import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VilleController } from './ville.controller';
import { VilleService } from './ville.service';
import { Ville } from './entities/ville.entity';
import { Departement } from '../departements/entities/departement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ville, Departement])],
  controllers: [VilleController],
  providers: [VilleService],
  exports: [VilleService],
})
export class VilleModule {}
