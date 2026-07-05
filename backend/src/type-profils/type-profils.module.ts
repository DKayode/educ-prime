import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeProfil } from './entities/type-profil.entity';
import { TypeProfilsService } from './type-profils.service';
import { TypeProfilsController } from './type-profils.controller';

@Module({
    imports: [TypeOrmModule.forFeature([TypeProfil])],
    controllers: [TypeProfilsController],
    providers: [TypeProfilsService],
    exports: [TypeProfilsService],
})
export class TypeProfilsModule { }
