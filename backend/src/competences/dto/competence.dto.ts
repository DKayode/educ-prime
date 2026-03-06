import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompetenceDto {
    @ApiProperty({ description: 'Nom de la compétence', example: 'ReactJS' })
    @IsString()
    @IsNotEmpty()
    nom: string;

    @ApiPropertyOptional({ description: 'Description de la compétence', example: 'Bibliothèque JavaScript pour créer des interfaces utilisateurs' })
    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateCompetenceDto {
    @ApiPropertyOptional({ description: 'Nom de la compétence', example: 'ReactJS' })
    @IsString()
    @IsOptional()
    nom?: string;

    @ApiPropertyOptional({ description: 'Description de la compétence', example: 'Bibliothèque JavaScript pour créer des interfaces utilisateurs' })
    @IsString()
    @IsOptional()
    description?: string;
}
