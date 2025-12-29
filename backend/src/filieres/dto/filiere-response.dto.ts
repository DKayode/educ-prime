import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';

export class FiliereResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nom: string;

    @ApiProperty({ type: () => Etablissement })
    etablissement: Etablissement;
}
