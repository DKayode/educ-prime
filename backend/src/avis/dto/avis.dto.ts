import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { entite_type_enum } from '@prisma/client';

export class CreateAvisDto {
    @ApiProperty({ description: 'ID de l\'entité (Service ou Offre)', example: 1 })
    @IsNumber()
    @IsNotEmpty()
    avisable_id: number;

    @ApiProperty({ description: 'Type de l\'entité', enum: entite_type_enum, example: entite_type_enum.Services })
    @IsEnum(entite_type_enum)
    @IsNotEmpty()
    avisable_type: entite_type_enum;

    @ApiProperty({ description: 'Note entre 1 et 5', example: 5 })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsNotEmpty()
    note: number;
}

export class UpdateAvisDto {
    @ApiPropertyOptional({ description: 'Note entre 1 et 5', example: 4 })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsOptional()
    note?: number;

    @ApiPropertyOptional({ description: 'Contenu du commentaire associé', example: 'Très bon service, je recommande!' })
    @IsString()
    @IsOptional()
    commentaire?: string;
}
