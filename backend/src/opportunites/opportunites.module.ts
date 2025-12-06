import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunitesService } from './opportunites.service';
import { OpportunitesController } from './opportunites.controller';
import { Opportunite } from './entities/opportunite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunite])],
  controllers: [OpportunitesController],
  providers: [OpportunitesService],
})
export class OpportunitesModule { }
