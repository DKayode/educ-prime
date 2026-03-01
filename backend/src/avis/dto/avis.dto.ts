import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAvisDto {
    @ApiProperty({ description: 'ID du service' })
    @IsNumber()
    @IsNotEmpty()
    service_id: number;

    @ApiProperty({ description: 'Note entre 1 et 5' })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsNotEmpty()
    note: number;
}

export class UpdateAvisDto {
    @ApiPropertyOptional({ description: 'Note entre 1 et 5' })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsOptional()
    note?: number;

    @ApiPropertyOptional({ description: 'Contenu du commentaire associé' })
    @IsString()
    @IsOptional()
    commentaire?: string;
}
