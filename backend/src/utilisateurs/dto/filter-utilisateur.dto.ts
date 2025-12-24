import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RoleType } from '../entities/utilisateur.entity';

export class FilterUtilisateurDto extends PaginationDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(RoleType)
    role?: RoleType;
}
