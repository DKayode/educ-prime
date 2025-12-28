import { ApiProperty } from '@nestjs/swagger';
import { EpreuveType } from '../entities/epreuve.entity';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';

class FiliereInEpreuveDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty({ type: () => Etablissement })
    etablissement: Etablissement;
}

class NiveauInEpreuveDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty()
    duree_mois: number;

    @ApiProperty({ type: () => FiliereInEpreuveDto })
    filiere: FiliereInEpreuveDto;
}

class MatiereInEpreuveDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty()
    description: string;

    @ApiProperty({ type: () => NiveauInEpreuveDto })
    niveau_etude: NiveauInEpreuveDto;
}

class ProfesseurInEpreuveDto {
    @ApiProperty()
    nom: string;

    @ApiProperty()
    prenom: string;

    @ApiProperty()
    telephone: string;
}

import { ApiProperty as ApiPropertyRessource } from '@nestjs/swagger';
import { Etablissement as EtablissementRessource } from '../../etablissements/entities/etablissement.entity';

class FiliereInRessourceDto {
    @ApiPropertyRessource()
    id: number;

    @ApiPropertyRessource()
    nom: string;

    @ApiPropertyRessource({ type: () => EtablissementRessource })
    etablissement: EtablissementRessource;
}

class NiveauInRessourceDto {
    @ApiPropertyRessource()
    id: number;

    @ApiPropertyRessource()
    nom: string;

    @ApiPropertyRessource()
    duree_mois: number;

    @ApiPropertyRessource({ type: () => FiliereInRessourceDto })
    filiere: FiliereInRessourceDto;
}

class MatiereInRessourceDto {
    @ApiPropertyRessource()
    id: number;

    @ApiPropertyRessource()
    nom: string;

    @ApiPropertyRessource()
    description: string;

    @ApiPropertyRessource({ type: () => NiveauInRessourceDto })
    niveau_etude: NiveauInRessourceDto;
}

class ProfesseurInRessourceDto {
    @ApiPropertyRessource()
    nom: string;

    @ApiPropertyRessource()
    prenom: string;

    @ApiPropertyRessource()
    telephone: string;
}

export class RessourceResponseDto {
    @ApiPropertyRessource()
    id: number;

    @ApiPropertyRessource()
    titre: string;

    @ApiPropertyRessource()
    type: string;

    @ApiPropertyRessource()
    url: string;

    @ApiPropertyRessource()
    date_creation: Date;

    @ApiPropertyRessource()
    date_publication: Date;

    @ApiPropertyRessource()
    nombre_pages: number;

    @ApiPropertyRessource()
    nombre_telechargements: number;

    @ApiPropertyRessource({ type: () => ProfesseurInRessourceDto })
    professeur: ProfesseurInRessourceDto;

    @ApiPropertyRessource({ type: () => MatiereInRessourceDto })
    matiere: MatiereInRessourceDto;
}

export class EpreuveResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    titre: string;

    @ApiProperty()
    url: string;

    @ApiProperty()
    duree_minutes: number;

    @ApiProperty()
    date_creation: Date;

    @ApiProperty()
    date_publication: Date;

    @ApiProperty()
    nombre_pages: number;

    @ApiProperty()
    nombre_telechargements: number;

    @ApiProperty({ enum: EpreuveType })
    type: EpreuveType;

    @ApiProperty({ type: () => ProfesseurInEpreuveDto })
    professeur: ProfesseurInEpreuveDto;

    @ApiProperty({ type: () => MatiereInEpreuveDto })
    matiere: MatiereInEpreuveDto;
}
