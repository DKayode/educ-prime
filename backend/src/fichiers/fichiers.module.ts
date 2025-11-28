import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FichiersController } from './fichiers.controller';
import { FichiersService } from './fichiers.service';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { Ressource } from '../ressources/entities/ressource.entity';
import { FirebaseConfig } from '../config/firebase.config';

@Module({
  imports: [TypeOrmModule.forFeature([Matiere, Epreuve, Ressource])],
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