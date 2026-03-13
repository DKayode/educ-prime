import { IsString, IsOptional, IsNotEmpty, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecruteurDto {
  @ApiPropertyOptional({ description: 'ID de l\'utilisateur (optionnel)', example: 1 })
  @IsNumber()
  @IsOptional()
  utilisateur_id?: number;

  @ApiPropertyOptional({ description: 'Numéro IFU du recruteur', example: '1234567890123' })
  @IsString()
  @IsOptional()
  numero_ifu?: string;

  @ApiProperty({ description: 'Nom de famille', example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  nom: string;

  @ApiProperty({ description: 'Nom de l\'entreprise ou du recruteur', example: 'Entreprise XYZ' })
  @IsString()
  @IsNotEmpty()
  nom_recruteur: string;

  @ApiProperty({ description: 'Prénom', example: 'John' })
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

  @ApiPropertyOptional({ description: 'Adresse', example: '123 Rue de la République, Paris' })
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone', example: '+33 6 12 34 56 78' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Biographie ou description', example: 'Cabinet de recrutement spécialisé.' })
  @IsString()
  @IsOptional()
  biographie?: string;
}

export class UpdateRecruteurDto {
  @ApiPropertyOptional({ description: 'ID de l\'utilisateur (optionnel)', example: 1 })
  @IsNumber()
  @IsOptional()
  utilisateur_id?: number;

  @ApiPropertyOptional({ description: 'Numéro IFU du recruteur', example: '1234567890123' })
  @IsString()
  @IsOptional()
  numero_ifu?: string;

  @ApiPropertyOptional({ description: 'Nom de famille', example: 'Da Cruz' })
  @IsString()
  @IsOptional()
  nom?: string;

  @ApiPropertyOptional({ description: 'Nom de l\'entreprise ou du recruteur', example: 'Entreprise XYZ' })
  @IsString()
  @IsOptional()
  nom_recruteur?: string;

  @ApiPropertyOptional({ description: 'Prénom', example: 'John' })
  @IsString()
  @IsOptional()
  prenom?: string;

  @ApiPropertyOptional({ description: 'Adresse', example: '123 Rue de la République, Paris' })
  @IsString()
  @IsOptional()
  adresse?: string;

  @ApiPropertyOptional({ description: 'Numéro de téléphone', example: '+33 6 12 34 56 78' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Biographie ou description', example: 'Cabinet de recrutement spécialisé.' })
  @IsString()
  @IsOptional()
  biographie?: string;
}

import { services_status_enum } from '@prisma/client';

export class UpdateRecruteurStatusDto {
  @ApiProperty({ description: 'Nouveau statut du recruteur', enum: services_status_enum, example: services_status_enum.approved })
  @IsNotEmpty()
  @IsEnum(services_status_enum)
  status: services_status_enum;
}
