import { Module } from '@nestjs/common';
import { CommentsPolymorphicService } from './comments-polymorphic.service';
import { CommentsPolymorphicController } from './comments-polymorphic.controller';
import { LikesPolymorphicModule } from '../likes-polymorphic/likes-polymorphic.module';

@Module({
    imports: [LikesPolymorphicModule],
    controllers: [CommentsPolymorphicController],
    providers: [CommentsPolymorphicService],
})
export class CommentsPolymorphicModule { }
