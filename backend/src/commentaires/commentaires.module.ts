import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentairesService } from './commentaires.service';
import { CommentairesController } from './commentaires.controller';
import { Commentaire } from './entities/commentaire.entity';
import { ParcoursModule } from '../parcours/parcours.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commentaire]),
    ParcoursModule,
  ],
  controllers: [CommentairesController],
  providers: [CommentairesService],
  exports: [CommentairesService],
})
export class CommentairesModule { }