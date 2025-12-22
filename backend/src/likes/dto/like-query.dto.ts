import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum LikeType {
    LIKE = 'like',
    DISLIKE = 'dislike',
}

export class LikeQueryDto {
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
    @IsUUID()
    parcours_id?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    commentaire_id?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    utilisateur_id?: number;

    @ApiProperty({ enum: LikeType, required: false })
    @IsOptional()
    @IsEnum(LikeType)
    type?: LikeType;

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

    @ApiProperty({ required: false, default: 'date_like' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'date_like';

    @ApiProperty({ enum: ['ASC', 'DESC'], required: false, default: 'DESC' })
    @IsOptional()
    @IsString()
    order?: 'ASC' | 'DESC' = 'DESC';
}