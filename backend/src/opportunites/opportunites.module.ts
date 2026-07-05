import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunitesService } from './opportunites.service';
import { OpportunitesController } from './opportunites.controller';
import { Opportunite } from './entities/opportunite.entity';
import { FichiersModule } from '../fichiers/fichiers.module';
import { TypeProfilsModule } from '../type-profils/type-profils.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Opportunite]),
    FichiersModule,
    TypeProfilsModule,
  ],
  controllers: [OpportunitesController],
  providers: [OpportunitesService],
})
export class OpportunitesModule { }
