import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { Like } from './entities/like.entity';
import { ParcoursModule } from '../parcours/parcours.module';
import { CommentairesModule } from '../commentaires/commentaires.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like]),
    ParcoursModule,
    CommentairesModule,
  ],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule { }