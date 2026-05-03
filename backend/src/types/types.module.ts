import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypesController } from './types.controller';
import { TypesService } from './types.service';
import { Type } from './entities/type.entity';
import { Service } from '../services/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Type, Service])],
  controllers: [TypesController],
  providers: [TypesService]
})
export class TypesModule { }
