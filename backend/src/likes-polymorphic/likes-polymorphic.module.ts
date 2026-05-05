import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LikesPolymorphicService } from './likes-polymorphic.service';
import { LikesPolymorphicController } from './likes-polymorphic.controller';
import { LikeUser } from './entities/like-user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([LikeUser])],
    controllers: [LikesPolymorphicController],
    providers: [LikesPolymorphicService],
    exports: [LikesPolymorphicService],
})
export class LikesPolymorphicModule { }
