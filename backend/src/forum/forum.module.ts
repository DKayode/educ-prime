import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';

import { LikesPolymorphicModule } from '../likes-polymorphic/likes-polymorphic.module';

import { FichiersModule } from '../fichiers/fichiers.module';

@Module({
    imports: [LikesPolymorphicModule, FichiersModule],
    controllers: [ForumController],
    providers: [ForumService],
})
export class ForumModule { }
