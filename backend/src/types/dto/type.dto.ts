import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntiteType } from '../../common/enums/entite-type.enum';

export class CreateTypeDto {
    @ApiProperty({ description: 'Nom du type', example: 'Développement Web' })
    @IsString()
    @IsNotEmpty()
    nom: string;

    @ApiPropertyOptional({ description: 'Description détaillée du type', example: 'Tout ce qui concerne la création de sites internet' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Entité à laquelle ce type est lié', enum: EntiteType, example: EntiteType.SERVICES })
    @IsEnum(EntiteType)
    @IsOptional()
    entite_type?: EntiteType;
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

    @ApiPropertyOptional({ description: 'Entité à laquelle ce type est lié', enum: EntiteType, example: EntiteType.SERVICES })
    @IsEnum(EntiteType)
    @IsOptional()
    entite_type?: EntiteType;
}
