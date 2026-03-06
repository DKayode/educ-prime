import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { entite_type_enum } from '@prisma/client';

export class CreateTypeDto {
    @ApiProperty({ description: 'Nom du type', example: 'Développement Web' })
    @IsString()
    @IsNotEmpty()
    nom: string;

    @ApiPropertyOptional({ description: 'Description détaillée du type', example: 'Tout ce qui concerne la création de sites internet' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Entité à laquelle ce type est lié', enum: entite_type_enum, example: entite_type_enum.Services })
    @IsEnum(entite_type_enum)
    @IsOptional()
    entite_type?: entite_type_enum;
}

export class UpdateTypeDto {
    @ApiPropertyOptional({ description: 'Nom du type', example: 'Développement Web' })
    @IsString()
    @IsOptional()
    nom?: string;

    @ApiPropertyOptional({ description: 'Description détaillée du type', example: 'Tout ce qui concerne la création de sites internet' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Entité à laquelle ce type est lié', enum: entite_type_enum, example: entite_type_enum.Services })
    @IsEnum(entite_type_enum)
    @IsOptional()
    entite_type?: entite_type_enum;
}
