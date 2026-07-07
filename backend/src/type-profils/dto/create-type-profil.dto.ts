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

    // Icône = un emoji (remplace le fichier importé R2). `pays` reste retiré par le middleware.
    @ApiProperty({ description: "Emoji de l'icône (ex. 🎓)", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    icone?: string;
}
