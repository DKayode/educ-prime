import { IsString, IsOptional, IsNotEmpty, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrestataireDto {
    @ApiPropertyOptional({ description: 'ID de l\'utilisateur (optionnel, injecté via le token en général)', example: 1 })
    @IsNumber()
    @IsOptional()
    utilisateur_id?: number;

    @ApiProperty({ description: 'Nom de famille du prestataire', example: 'Dupont' })
    @IsString()
    @IsNotEmpty()
    nom: string;

    @ApiProperty({ description: 'Prénom du prestataire', example: 'Jean' })
    @IsString()
    @IsNotEmpty()
    prenom: string;

    @ApiPropertyOptional({ description: 'URL de la photo de profil', example: 'https://example.com/photo.jpg' })
    @IsString()
    @IsOptional()
    photo_profil?: string;

    @ApiPropertyOptional({ description: 'URL de la photo d\'identité', example: 'https://example.com/id.jpg' })
    @IsString()
    @IsOptional()
    photo_identite?: string;

    @ApiPropertyOptional({ description: 'Biographie du prestataire', example: 'Développeur Fullstack expérimenté.' })
    @IsString()
    @IsOptional()
    biographie?: string;

    @ApiPropertyOptional({ description: 'Domaine de compétence principal', example: 'Ingénierie Logicielle' })
    @IsString()
    @IsOptional()
    domaine_competence?: string;

    @ApiPropertyOptional({ description: 'Lien vers le portfolio', example: 'https://monportfolio.com' })
    @IsString()
    @IsOptional()
    lien_portfolio?: string;

    @ApiPropertyOptional({ description: 'Liste des identifiants (slugs) des compétences', example: ['analyse-de-donnees', 'programmation-web'] })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    competences?: string[];
}

export class UpdatePrestataireDto {
    @ApiPropertyOptional({ description: 'ID de l\'utilisateur (optionnel)', example: 1 })
    @IsNumber()
    @IsOptional()
    utilisateur_id?: number;

    @ApiPropertyOptional({ description: 'Nom de famille du prestataire', example: 'Dupont' })
    @IsString()
    @IsOptional()
    nom?: string;

    @ApiPropertyOptional({ description: 'Prénom du prestataire', example: 'Jean' })
    @IsString()
    @IsOptional()
    prenom?: string;

    @ApiPropertyOptional({ description: 'Biographie du prestataire', example: 'Expert en développement web.' })
    @IsString()
    @IsOptional()
    biographie?: string;

    @ApiPropertyOptional({ description: 'Domaine de compétence principal', example: 'Développement Web' })
    @IsString()
    @IsOptional()
    domaine_competence?: string;

    @ApiPropertyOptional({ description: 'Lien vers le portfolio', example: 'https://monportfolio.com' })
    @IsString()
    @IsOptional()
    lien_portfolio?: string;

    @ApiPropertyOptional({ description: 'Liste des identifiants (slugs) des compétences', example: ['reactjs', 'nestjs'] })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    competences?: string[];
}
