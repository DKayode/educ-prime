import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RoleType } from '../entities/utilisateur.entity';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterUtilisateurDto extends PaginationDto {
    // Cap page size for the admin user list: enrichUserComplete runs per-user
    // lookups, so an unbounded limit would be an N+1 slow-query vector. Scoped
    // here (not on the shared PaginationDto) so other endpoints are unaffected.
    @ApiPropertyOptional({ description: 'Nombre d\'éléments par page (max 100)', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'La limite doit être un nombre entier' })
    @Min(1, { message: 'La limite doit être supérieure ou égale à 1' })
    @Max(100, { message: 'La limite ne peut pas dépasser 100' })
    limit?: number = 10;

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
    @ApiPropertyOptional({ description: 'Champ de tri (ex: date_creation, filleuls)', required: false })
    @IsString()
    sort_by?: string;

    @IsOptional()
    @ApiPropertyOptional({ description: 'Filtrer par ID du parrain', required: false })
    @IsString()
    parrain_id?: string;
}
