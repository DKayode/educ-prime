import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStructureDto {
    @ApiProperty({ description: 'Nom de la structure' })
    @IsString()
    @MaxLength(255)
    nom: string;

    @ApiProperty({ description: 'Description de la structure', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
