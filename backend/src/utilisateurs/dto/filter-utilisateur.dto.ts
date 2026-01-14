import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RoleType } from '../entities/utilisateur.entity';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterUtilisateurDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(RoleType)
    role?: RoleType;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    activated?: boolean;

    @IsOptional()
    @ApiPropertyOptional({ description: 'Champ de tri (ex: date_creation)', required: false })
    @IsString()
    sort_by?: string;
}
