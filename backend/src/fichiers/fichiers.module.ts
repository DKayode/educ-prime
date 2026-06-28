import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FichiersController } from './fichiers.controller';
import { FichiersService } from './fichiers.service';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { FirebaseConfig } from '../config/firebase.config';
import { FilesModule } from '../files/files.module';

@Module({
  // TRANSITIONAL: FilesModule provides FilesService for the legacy → R2 mirror.
  imports: [TypeOrmModule.forFeature([Matiere, Epreuve]), FilesModule],
  controllers: [FichiersController],
  providers: [
    FichiersService,
    {
      provide: 'FirebaseConfig',
      useClass: FirebaseConfig,
    }
  ],
  exports: [FichiersService]
})
export class FichiersModule { }