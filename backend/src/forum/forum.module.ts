import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Forum } from './entities/forum.entity';
import { LikesPolymorphicModule } from '../likes-polymorphic/likes-polymorphic.module';

import { FichiersModule } from '../fichiers/fichiers.module';
import { TypeProfilsModule } from '../type-profils/type-profils.module';

@Module({
    imports: [TypeOrmModule.forFeature([Forum]), LikesPolymorphicModule, FichiersModule, TypeProfilsModule],
    controllers: [ForumController],
    providers: [ForumService],
})
export class ForumModule { }
