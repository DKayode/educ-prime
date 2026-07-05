import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartementController } from './departement.controller';
import { DepartementService } from './departement.service';
import { Departement } from './entities/departement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Departement])],
  controllers: [DepartementController],
  providers: [DepartementService],
  exports: [DepartementService],
})
export class DepartementModule {}
