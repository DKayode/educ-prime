import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersionService } from './app-version.service';
import { AppVersionController } from './app-version.controller';
import { AppVersion } from './entities/app-version.entity';

@Module({
    imports: [TypeOrmModule.forFeature([AppVersion])],
    controllers: [AppVersionController],
    providers: [AppVersionService],
})
export class AppVersionModule { }
