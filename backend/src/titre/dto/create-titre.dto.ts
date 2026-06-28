import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTitreDto {
    @ApiProperty({ description: 'Nom du titre' })
    @IsString()
    @MaxLength(255)
    nom: string;

    @ApiProperty({ description: 'Description du titre', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
