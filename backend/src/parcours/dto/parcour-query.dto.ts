import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MediaType } from './create-parcour.dto';

export class ParcourQueryDto {
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

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    titre?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    category_id?: number;

    @ApiProperty({ enum: MediaType, required: false })
    @IsOptional()
    @IsEnum(MediaType)
    type_media?: MediaType;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ required: false, default: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiProperty({ enum: ['ASC', 'DESC'], required: false, default: 'DESC' })
    @IsOptional()
    @IsString()
    order?: 'ASC' | 'DESC' = 'DESC';
}