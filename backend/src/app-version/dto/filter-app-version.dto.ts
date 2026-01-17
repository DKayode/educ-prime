import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AppPlatform } from '../entities/app-version.entity';

export class FilterAppVersionDto extends PaginationDto {
    @ApiPropertyOptional({ enum: AppPlatform, description: 'Filtrer par plateforme' })
    @IsOptional()
    @IsEnum(AppPlatform)
    platform?: AppPlatform;

    @ApiPropertyOptional({ description: 'Filtrer par statut actif', type: Boolean })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    is_active?: boolean;
}
