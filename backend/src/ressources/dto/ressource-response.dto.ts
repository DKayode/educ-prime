import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';

class FiliereInRessourceDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty({ type: () => Etablissement })
    etablissement: Etablissement;
}

class NiveauInRessourceDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty()
    duree_mois: number;

    @ApiProperty({ type: () => FiliereInRessourceDto })
    filiere: FiliereInRessourceDto;
}

class MatiereInRessourceDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty()
    description: string;

    @ApiProperty({ type: () => NiveauInRessourceDto })
    niveau_etude: NiveauInRessourceDto;
}

class ProfesseurInRessourceDto {
    @ApiProperty()
    nom: string;

    @ApiProperty()
    prenom: string;

    @ApiProperty()
    telephone: string;
}

export class RessourceResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    titre: string;

    @ApiProperty()
    type: string;

    @ApiProperty()
    url: string;

    @ApiProperty()
    date_creation: Date;

    @ApiProperty()
    date_publication: Date;

    @ApiProperty()
    nombre_pages: number;

    @ApiProperty()
    nombre_telechargements: number;

    @ApiProperty({ type: () => ProfesseurInRessourceDto })
    professeur: ProfesseurInRessourceDto;

    @ApiProperty({ type: () => MatiereInRessourceDto })
    matiere: MatiereInRessourceDto;
}
