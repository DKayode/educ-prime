import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTypeProfilDto {
    @ApiProperty({ description: 'Titre du type de profil' })
    @IsString()
    @MaxLength(255)
    titre: string;

    @ApiProperty({ description: 'Sous-titre du type de profil', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    sous_titre?: string;

    // NB: l'icône n'est PAS dans ce DTO — elle est téléversée séparément via le
    // registre R2 FilesModule (POST /files/type_profils/:uuid/icone/upload), comme
    // categories.icone. `pays` non plus : le middleware le retire des DTO.
}
