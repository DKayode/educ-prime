import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MatiereExamenQueryDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({ required: false, description: "Filtrer par ID du type d'examen parent" })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    type_examen?: number;

    @ApiProperty({ required: false, description: 'Recherche par nom' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'] })
    @IsOptional()
    @IsString()
    sort_order?: 'ASC' | 'DESC' = 'ASC';
}
