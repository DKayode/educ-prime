import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TitreService } from './titre.service';
import { TitreController } from './titre.controller';
import { Titre } from './entities/titre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Titre])],
  controllers: [TitreController],
  providers: [TitreService],
  exports: [TitreService],
})
export class TitreModule {}
