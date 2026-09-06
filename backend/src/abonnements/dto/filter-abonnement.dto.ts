import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StatutAbonnement } from '../entities/abonnement.entity';

export class FilterAbonnementDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatutAbonnement })
  @IsOptional()
  @IsEnum(StatutAbonnement, { message: 'Statut invalide' })
  statut?: StatutAbonnement;

  @ApiPropertyOptional({ description: 'Code du plan (MENSUEL, ...)' })
  @IsOptional()
  @IsString()
  plan_code?: string;
}
