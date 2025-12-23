import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CommentaireQueryDto {
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
    @IsInt()
    parent_id?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    date_commentaire?: Date;

    @ApiProperty({ required: false, default: 'date_commentaire' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'date_commentaire';

    @ApiProperty({ enum: ['ASC', 'DESC'], required: false, default: 'DESC' })
    @IsOptional()
    @IsString()
    order?: 'ASC' | 'DESC' = 'DESC';
}