import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicitesController } from './publicites.controller';
import { PublicitesService } from './publicites.service';
import { Publicite } from './entities/publicite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Publicite])],
  controllers: [PublicitesController],
  providers: [PublicitesService],
})
export class PublicitesModule { }
