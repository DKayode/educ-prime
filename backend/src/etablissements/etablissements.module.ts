import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtablissementsController } from './etablissements.controller';
import { EtablissementsService } from './etablissements.service';
import { Etablissement } from './entities/etablissement.entity';
import { Filiere } from '../filieres/entities/filiere.entity';
import { NiveauEtude } from '../niveau-etude/entities/niveau-etude.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { Ressource } from '../ressources/entities/ressource.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Etablissement, Filiere, NiveauEtude, Matiere, Epreuve, Ressource])],
  controllers: [EtablissementsController],
  providers: [EtablissementsService],
})
export class EtablissementsModule { }