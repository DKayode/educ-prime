import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypesExamenService } from './types-examen.service';
import { TypesExamenController } from './types-examen.controller';
import { TypeExamen } from './entities/type-examen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TypeExamen])],
  controllers: [TypesExamenController],
  providers: [TypesExamenService],
  exports: [TypesExamenService],
})
export class TypesExamenModule {}
