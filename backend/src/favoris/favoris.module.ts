// favoris.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavorisService } from './favoris.service';
import { FavorisController } from './favoris.controller';
import { Favori } from './entities/favoris.entity';
import { ParcoursModule } from '../parcours/parcours.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favori]),
    ParcoursModule,
  ],
  controllers: [FavorisController],
  providers: [FavorisService],
  exports: [FavorisService],
})
export class FavorisModule { }