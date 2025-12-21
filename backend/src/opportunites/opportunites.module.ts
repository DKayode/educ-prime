import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunitesService } from './opportunites.service';
import { OpportunitesController } from './opportunites.controller';
import { Opportunite } from './entities/opportunite.entity';
import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Opportunite]),
    FichiersModule,
  ],
  controllers: [OpportunitesController],
  providers: [OpportunitesService],
})
export class OpportunitesModule { }
