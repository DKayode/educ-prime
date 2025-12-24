import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CategoryQueryDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiProperty({ required: false, enum: ['nom', 'created_at', 'ordre'] })
    @IsOptional()
    @IsString()
    sort_by?: string = 'ordre';

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'] })
    @IsOptional()
    @IsString()
    sort_order?: 'ASC' | 'DESC' = 'ASC';
}