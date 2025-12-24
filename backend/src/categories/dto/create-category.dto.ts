import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsHexColor, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: 'Nom de la catégorie' })
    @IsString()
    @MaxLength(100)
    nom: string;

    @ApiProperty({ description: 'Description de la catégorie', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({ description: 'Icône de la catégorie', required: false })
    @IsOptional()
    @IsString()
    icone?: string;

    @ApiProperty({ description: 'Est-ce que la catégorie est active ?', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean = true;

    @ApiProperty({ description: 'Ordre d\'affichage', default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    ordre?: number = 0;
}