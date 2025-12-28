import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';

class FiliereInNiveauDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty({ type: () => Etablissement })
    etablissement: Etablissement;
}

export class NiveauEtudeResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty()
    duree_mois: number;

    @ApiProperty({ type: () => FiliereInNiveauDto })
    filiere: FiliereInNiveauDto;
}

class FiliereInMatiereDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty({ type: () => Etablissement })
    etablissement: Etablissement;
}

class NiveauInMatiereDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty()
    duree_mois: number;

    @ApiProperty({ type: () => FiliereInMatiereDto })
    filiere: FiliereInMatiereDto;
}

export class MatiereResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty()
    description: string;

    @ApiProperty({ type: () => NiveauInMatiereDto })
    niveau_etude: NiveauInMatiereDto;
}
