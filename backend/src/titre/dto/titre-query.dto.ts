import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TitreQueryDto {
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
    search?: string;

    @ApiProperty({ required: false, enum: ['nom', 'created_at'] })
    @IsOptional()
    @IsString()
    sort_by?: string = 'nom';

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'] })
    @IsOptional()
    @IsString()
    sort_order?: 'ASC' | 'DESC' = 'ASC';
}
