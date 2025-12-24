import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class FavoriQueryDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 20;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    parcours_id?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    utilisateur_id?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    date_debut?: Date;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    date_fin?: Date;

    @ApiProperty({ required: false, default: 'date_favoris' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'date_favoris';

    @ApiProperty({ enum: ['ASC', 'DESC'], required: false, default: 'DESC' })
    @IsOptional()
    @IsString()
    order?: 'ASC' | 'DESC' = 'DESC';
}