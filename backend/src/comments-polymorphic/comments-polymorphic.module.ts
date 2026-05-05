import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsPolymorphicService } from './comments-polymorphic.service';
import { CommentsPolymorphicController } from './comments-polymorphic.controller';
import { LikesPolymorphicModule } from '../likes-polymorphic/likes-polymorphic.module';
import { CommentaireUser } from './entities/commentaire-user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CommentaireUser]), LikesPolymorphicModule],
    controllers: [CommentsPolymorphicController],
    providers: [CommentsPolymorphicService],
})
export class CommentsPolymorphicModule { }
