import { Module } from '@nestjs/common';
import { LikesPolymorphicService } from './likes-polymorphic.service';
import { LikesPolymorphicController } from './likes-polymorphic.controller';

@Module({
    controllers: [LikesPolymorphicController],
    providers: [LikesPolymorphicService],
    exports: [LikesPolymorphicService],
})
export class LikesPolymorphicModule { }
