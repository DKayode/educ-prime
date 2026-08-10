import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTypeExamenDto {
    @ApiProperty({ description: "Nom du type d'examen (BAC, CAP, BEPC…)" })
    @IsString()
    @MaxLength(255)
    nom: string;

    @ApiProperty({ description: "Description du type d'examen", required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
